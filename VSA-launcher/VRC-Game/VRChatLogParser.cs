using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using System.Linq;
using System.Threading.Tasks;

namespace VSA_launcher
{
    /// <summary>
    /// VRChatのログファイルからワールド情報やフレンドリストを解析するクラス
    /// </summary>
    public class VRChatLogParser
    {
        // ログファイルのディレクトリパス候補
        private static readonly string[] LOG_PATH_CANDIDATES = new string[]
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData) + "Low", "VRChat", "VRChat"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "..\\LocalLow\\VRChat\\VRChat")
        };
        
        // ログファイルのディレクトリパス（実際に見つかったパス）
        private readonly string? _logFolderPath;
        
        // パターンマッチング用の正規表現（コンパイル済み）
        private readonly Regex _worldEntryPattern = new Regex(@"Entering Room: (.*?)(?:\n|$)", RegexOptions.Compiled);
        private readonly Regex _worldIdPattern = new Regex(@"wrld_[0-9a-fA-F\-]+", RegexOptions.Compiled);

        // フレンド検出用の正規表現
        private readonly Regex _playerJoinedPattern = new Regex(@"\[Behaviour\] OnPlayerJoin(?:ed|Complete) \((.*?)\)", RegexOptions.Compiled);
        private readonly Regex _remotePlayerPattern = new Regex(@"\[Behaviour\] Initialized PlayerAPI ""(.*?)"" is remote", RegexOptions.Compiled);

        // ユーザー名（撮影者）を抽出するためのパターン
        private readonly Regex _usernamePattern = new Regex(@"\[Behaviour\] Initialized PlayerAPI ""(.*?)"" is local", RegexOptions.Compiled);
        
        // 解析結果の保持
        public string CurrentWorldName { get; private set; } = "Unknown World";
        public string CurrentWorldId { get; private set; } = "";
        public List<string> CurrentFriends { get; private set; } = new List<string>();
        // 撮影者（ユーザー名）を保持するプロパティを追加
        public string Username { get; private set; } = "Unknown User";
        public DateTime LastLogParseTime { get; private set; }
        public bool IsValidLogFound { get; private set; }
        
        // 自動更新間隔（ミリ秒）
        private const int AUTO_UPDATE_INTERVAL = 10000; // 10秒
        private System.Threading.Timer? _autoUpdateTimer;
        
        // イベント - ワールド変更時に発火
        public event EventHandler<WorldChangedEventArgs>? WorldChanged;
        
        /// <summary>
        /// コンストラクタ - VRChatログフォルダを検索して初期化
        /// </summary>
        public VRChatLogParser(bool enableAutoUpdate = true)
        {
            // 有効なログパスを検索
            foreach (var path in LOG_PATH_CANDIDATES)
            {
                if (Directory.Exists(path))
                {
                    _logFolderPath = path;
                    IsValidLogFound = true;
                    break;
                }
            }
            
            if (IsValidLogFound)
            {
                // 初回解析
                ParseLatestLog();
                
                // 自動更新タイマーのセットアップ（オプション）
                if (enableAutoUpdate)
                {
                    _autoUpdateTimer = new System.Threading.Timer(
                        callback: _ => Task.Run(() => AutoUpdateLog()),
                        state: null,
                        dueTime: AUTO_UPDATE_INTERVAL, 
                        period: AUTO_UPDATE_INTERVAL
                    );
                }
            }
            else
            {
                LogError("VRChatログフォルダが見つかりませんでした。メタデータにデフォルト値を使用します。");
            }
        }
        
        /// <summary>
        /// 自動更新処理（新しいワールド情報を定期的にチェック）
        /// </summary>
        private void AutoUpdateLog()
        {
            try
            {
                string oldWorldName = CurrentWorldName;
                string oldWorldId = CurrentWorldId;
                
                // ログ解析
                if (ParseLatestLog() && 
                    (oldWorldName != CurrentWorldName || oldWorldId != CurrentWorldId))
                {
                    // ワールド情報が変更された場合にイベント発火
                    OnWorldChanged(new WorldChangedEventArgs(CurrentWorldName, CurrentWorldId));
                }
            }
            catch (Exception ex)
            {
                // タイマーからの呼び出しでの例外は無視するが、ログには残す
                LogError($"自動ログ更新中のエラー: {ex.Message}");
            }
        }

        /// <summary>
        /// 最新のログファイルを解析
        /// </summary>
        /// <returns>解析に成功したかどうか</returns>
        public bool ParseLatestLog()
        {
            if (string.IsNullOrEmpty(_logFolderPath) || !Directory.Exists(_logFolderPath))
            {
                LogError("VRChatログフォルダが見つかりません");
                return false;
            }
            
            try
            {
                // 最新のログファイルを取得（複数の命名パターンに対応）
                string[] searchPatterns = { "output_log_*.txt", "VRChat-*.log" };
                var logFiles = new List<string>();
                
                foreach (var pattern in searchPatterns)
                {
                    if (Directory.Exists(_logFolderPath))
                    {
                        logFiles.AddRange(Directory.GetFiles(_logFolderPath, pattern));
                    }
                }
                
                if (logFiles.Count == 0)
                {
                    LogError("VRChatログファイルが見つかりません");
                    return false;
                }
                
                // 最新のログファイルを選択（作成日時の降順）
                string? latestLogPath = logFiles
                    .OrderByDescending(f => File.GetLastWriteTime(f))
                    .FirstOrDefault();
                
                if (string.IsNullOrEmpty(latestLogPath))
                {
                    LogError("有効なログファイルが見つかりません");
                    return false;
                }
                
                // ログファイルを読み込む（共有モードで開く）
                string logContent;
                using (var fileStream = new FileStream(latestLogPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                using (var reader = new StreamReader(fileStream))
                {
                    // ログファイルが大きい場合は最後の部分のみ読み込む
                    const int MAX_READ_SIZE = 1024 * 1024; // 1MB
                    
                    if (fileStream.Length > MAX_READ_SIZE)
                    {
                        fileStream.Seek(-MAX_READ_SIZE, SeekOrigin.End);
                        // 行の途中からの読み込みを避けるため、次の行の先頭まで読み飛ばす
                        reader.ReadLine();
                    }
                    
                    logContent = reader.ReadToEnd();
                }
                
                // ワールド情報の解析
                ExtractWorldInformation(logContent);
                
                // フレンドリストの解析
                ExtractFriendsList(logContent);
                
                // ユーザー名（撮影者）の解析
                ExtractUsername(logContent);
                
                LastLogParseTime = DateTime.Now;
                return true;
            }
            catch (Exception ex)
            {
                LogError($"VRChatログ解析エラー: {ex.Message}");
                return false;
            }
        }
        
        /// <summary>
        /// ログ内容からワールド情報を抽出
        /// </summary>
        private void ExtractWorldInformation(string logContent)
        {
            var worldMatches = _worldEntryPattern.Matches(logContent);
            if (worldMatches.Count > 0)
            {
                // 最後のワールドエントリを取得
                string fullWorldEntry = worldMatches[worldMatches.Count - 1].Groups[1].Value.Trim();
                
                // ワールドIDの抽出
                var worldIdMatch = _worldIdPattern.Match(fullWorldEntry);
                if (worldIdMatch.Success)
                {
                    CurrentWorldId = worldIdMatch.Value;
                    
                    // ワールド名（IDを除く）を抽出
                    CurrentWorldName = fullWorldEntry
                        .Replace(CurrentWorldId, "")
                        .Replace("()", "")  // 空のカッコを削除
                        .Trim();
                    
                    // カッコの除去
                    if (CurrentWorldName.StartsWith("(") && CurrentWorldName.EndsWith(")"))
                    {
                        CurrentWorldName = CurrentWorldName.Substring(1, CurrentWorldName.Length - 2).Trim();
                    }
                    
                    // ワールド名が空の場合、デフォルト値を設定
                    if (string.IsNullOrEmpty(CurrentWorldName))
                    {
                        CurrentWorldName = "Unknown World";
                    }
                }
                else
                {
                    // IDが見つからない場合は、エントリ全体をワールド名とする
                    CurrentWorldName = fullWorldEntry.Trim();
                    CurrentWorldId = "";
                }
            }
        }
        
        /// <summary>
        /// ログ内容からフレンドリストを抽出
        /// </summary>
        private void ExtractFriendsList(string logContent)
        {
            // 一時的なフレンドリスト
            var friendsList = new HashSet<string>();

            // OnPlayerJoined/Complete パターンからフレンド名を抽出
            var joinMatches = _playerJoinedPattern.Matches(logContent);
            foreach (Match match in joinMatches)
            {
                if (match.Success && match.Groups.Count > 1)
                {
                    string friendName = match.Groups[1].Value.Trim();
                    if (!string.IsNullOrEmpty(friendName))
                    {
                        friendsList.Add(friendName);
                    }
                }
            }

            // リモートプレイヤーパターンからフレンド名を抽出
            var remoteMatches = _remotePlayerPattern.Matches(logContent);
            foreach (Match match in remoteMatches)
            {
                if (match.Success && match.Groups.Count > 1)
                {
                    string friendName = match.Groups[1].Value.Trim();
                    if (!string.IsNullOrEmpty(friendName))
                    {
                        friendsList.Add(friendName);
                    }
                }
            }

            // リストを更新
            CurrentFriends = friendsList.ToList();
            
            // デバッグ: フレンド検出のログ出力
            Console.WriteLine($"[DEBUG] フレンド検出: {CurrentFriends.Count}人 - {string.Join(", ", CurrentFriends)}");
        }

        /// <summary>
        /// ログ内容からユーザー名を抽出
        /// </summary>
        private void ExtractUsername(string logContent)
        {
            var usernameMatch = _usernamePattern.Match(logContent);
            if (usernameMatch.Success && usernameMatch.Groups.Count > 1)
            {
                string username = usernameMatch.Groups[1].Value.Trim();
                
                // ユーザー名が空でない場合のみ更新
                if (!string.IsNullOrEmpty(username))
                {
                    Username = username;
                    Console.WriteLine($"[DEBUG] 自分のユーザー名を検出: {username}");
                }
            }
            else
            {
                Console.WriteLine("[DEBUG] 自分のユーザー名を検出できませんでした");
            }
        }

        /// <summary>
        /// フレンドリストを指定の区切り文字で結合した文字列を取得
        /// </summary>
        /// <param name="separator">区切り文字（デフォルトはドット）</param>
        /// <returns>区切られたフレンド名リスト</returns>
        public string GetFriendsString(string separator = ".")
        {
            return string.Join(separator, CurrentFriends);
        }
        
        /// <summary>
        /// メタデータ辞書を生成（PngCSで使用）
        /// </summary>
        /// <returns>メタデータキーと値のディクショナリ</returns>
        public Dictionary<string, string> GenerateMetadata()
        {
            // メタデータの生成（Form1から直接使用可能）
            return new Dictionary<string, string>
            {
                // 処理済みマーカー
                { "VSACheck", "true" },
                
                // ワールド情報
                { "WorldName", CurrentWorldName },
                { "WorldID", CurrentWorldId },
                
                // フレンド情報（.区切り）
                { "Friends", GetFriendsString() },
                
                // 撮影者情報
                { "Username", Username },
                
                // 撮影日時
                { "CaptureTime", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") }
            };
        }

        /// <summary>
        /// ワールド変更イベント発火
        /// </summary>
        protected virtual void OnWorldChanged(WorldChangedEventArgs e)
        {
            WorldChanged?.Invoke(this, e);
        }

        /// <summary>
        /// エラーログを出力（アプリケーションのログシステムと連携可能）
        /// </summary>
        /// <param name="message">エラーメッセージ</param>
        private void LogError(string message)
        {
            Console.WriteLine($"[ERROR] {DateTime.Now:yyyy-MM-dd HH:mm:ss} - {message}");
            
            // 将来的なログ連携のためのフック
            // Logger.LogError(message); などに置き換え可能
        }
        
        /// <summary>
        /// リソース解放
        /// </summary>
        public void Dispose()
        {
            _autoUpdateTimer?.Dispose();
        }
    }
    
    /// <summary>
    /// ワールド変更イベント引数
    /// </summary>
    public class WorldChangedEventArgs : EventArgs
    {
        public string WorldName { get; }
        public string WorldId { get; }
        
        public WorldChangedEventArgs(string worldName, string worldId)
        {
            WorldName = worldName;
            WorldId = worldId;
        }
    }
}