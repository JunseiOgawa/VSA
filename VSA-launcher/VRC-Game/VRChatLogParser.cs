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

        // タイムスタンプ付きログエントリの正規表現
        private readonly Regex _timeStampLogPattern = new Regex(@"(\d{4}.\d{2}.\d{2} \d{2}:\d{2}:\d{2}).*", RegexOptions.Compiled);
        
        // インスタンス境界検出用の正規表現を追加
        private readonly Regex _instanceJoinPattern = new Regex(@"\[(\d{4}.\d{2}.\d{2} \d{2}:\d{2}:\d{2}).*?\] \[Behaviour\] Joining (.*?) (wrld_.*?:)", RegexOptions.Compiled);
        private readonly Regex _onJoinedRoomPattern = new Regex(@"\[(\d{4}.\d{2}.\d{2} \d{2}:\d{2}:\d{2}).*?\] \[Behaviour\] OnJoinedRoom has been called", RegexOptions.Compiled);
        private readonly Regex _roomJoinCompletePattern = new Regex(@"\[(\d{4}.\d{2}.\d{2} \d{2}:\d{2}:\d{2}).*?\] \[Behaviour\] Room Join Completed for (.*)", RegexOptions.Compiled);
        
        // 解析結果の保持
        public string CurrentWorldName { get; private set; } = "Unknown World";
        public string CurrentWorldId { get; private set; } = "";
        // フレンドリストを保持するリストを追加
        public List<string> CurrentFriends { get; private set; } = new List<string>();
        // 撮影者（ユーザー名）を保持するプロパティを追加
        public string Username { get; private set; } = "Unknown User";
        public DateTime LastLogParseTime { get; private set; }
        public bool IsValidLogFound { get; private set; }
        
        // 自動更新間隔（ミリ秒）
        private const int AUTO_UPDATE_INTERVAL = 2000; // 2秒
        private System.Threading.Timer? _autoUpdateTimer;
        
        // イベント - ワールド変更時に発火
        public event EventHandler<WorldChangedEventArgs>? WorldChanged;
        
        // ワールド移動とプレイヤー参加時間を追跡するための変数
        private Dictionary<string, DateTime> _playerJoinTimestamps = new Dictionary<string, DateTime>();
        private DateTime _lastWorldChangeTime = DateTime.MinValue;
        
        // プレイヤー管理用
        private HashSet<string> _activePlayers = new HashSet<string>();
        private DateTime _lastRoomJoinTime = DateTime.MinValue;

        private VRChatUserDetector _userDetector = new VRChatUserDetector();
        
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
                if (ParseLatestLog())
                {
                    // ワールド情報が変更された場合
                    if (oldWorldName != CurrentWorldName || oldWorldId != CurrentWorldId)
                    {
                        OnWorldChanged(new WorldChangedEventArgs(CurrentWorldName, CurrentWorldId));
                    }
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
                    const int MAX_READ_SIZE = 　1024 * 1024; // 1MB
                    
                    if (fileStream.Length > MAX_READ_SIZE)
                    {
                        fileStream.Seek(-MAX_READ_SIZE, SeekOrigin.End);
                        // 行の途中からの読み込みを避けるため、次の行の先頭まで読み飛ばす
                        reader.ReadLine();
                    }
                    
                    logContent = reader.ReadToEnd();
                }
                
                // ワールド情報の解析（フレンドリストはここではクリアしない）
                string oldWorldName = CurrentWorldName;
                string oldWorldId = CurrentWorldId;
                
                // ワールド情報を抽出する時、タイムスタンプも一緒に取得
                DateTime worldChangeTime = ExtractWorldInformation(logContent);
                
                // フレンドリストの解析（ワールド変更のタイムスタンプを考慮）
                ExtractFriendsList(logContent, worldChangeTime);
                
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
        /// ログ内容からワールド情報を抽出し、変更時刻を返す
        /// </summary>
        private DateTime ExtractWorldInformation(string logContent)
        {
            DateTime worldChangeTime = _lastWorldChangeTime;
            bool worldChanged = false;
            string lastInstanceId = "";
            DateTime lastInstanceJoinTime = DateTime.MinValue;
            
            // インスタンスへの参加ログを検索（最も信頼性の高いワールド変更指標）
            var instanceJoinMatches = _instanceJoinPattern.Matches(logContent);
            if (instanceJoinMatches.Count > 0)
            {
                var lastJoin = instanceJoinMatches[instanceJoinMatches.Count - 1];
                if (lastJoin.Groups.Count >= 4)
                {
                    string joinTimeString = lastJoin.Groups[1].Value;
                    string worldName = lastJoin.Groups[2].Value.Trim();
                    string instanceId = lastJoin.Groups[3].Value;
                    
                    if (DateTime.TryParse(joinTimeString, out DateTime joinTime))
                    {
                        lastInstanceJoinTime = joinTime;
                        
                        // 以前のワールド情報を保存
                        string oldWorldName = CurrentWorldName;
                        string oldWorldId = CurrentWorldId;
                        
                        // ワールド情報を更新
                        CurrentWorldName = worldName.Trim();
                        CurrentWorldId = instanceId.Trim();
                        
                        // ワールドID内にある不要な文字を削除
                        if (CurrentWorldId.EndsWith(":"))
                        {
                            CurrentWorldId = CurrentWorldId.Substring(0, CurrentWorldId.Length - 1);
                        }
                        
                        worldChangeTime = joinTime;
                        _lastWorldChangeTime = joinTime;
                        _lastRoomJoinTime = joinTime;
                        
                        Console.WriteLine($"[DEBUG] インスタンス参加検出: {CurrentWorldName} ({CurrentWorldId}) 時刻: {joinTime}");
                        
                        worldChanged = true;
                    }
                }
            }
            
            // "Entering Room"エントリを検索（フォールバックとして使用）
            if (!worldChanged)
            {
                var roomMatches = _worldEntryPattern.Matches(logContent);
                if (roomMatches.Count > 0)
                {
                    // 最後のワールドエントリを取得
                    string fullWorldEntry = roomMatches[roomMatches.Count - 1].Groups[1].Value.Trim();
                    
                    // 前のワールド情報を保存
                    string oldWorldName = CurrentWorldName;
                    string oldWorldId = CurrentWorldId;
                    
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
                    
                    // ワールド変更を検出したら、変更時刻を更新
                    if (oldWorldName != CurrentWorldName || oldWorldId != CurrentWorldId)
                    {
                        // ワールドエントリの発生時間を取得
                        worldChangeTime = GetEntryTimestamp(logContent, "Entering Room: " + fullWorldEntry);
                        _lastWorldChangeTime = worldChangeTime;
                        _lastRoomJoinTime = worldChangeTime; // ルーム参加時間も更新
                        
                        Console.WriteLine($"[DEBUG] ワールド移動検出（代替検出）: {oldWorldName} → {CurrentWorldName}, 時刻: {worldChangeTime}");
                        
                        worldChanged = true;
                    }
                }
            }
            
            // OnJoinedRoomイベントを検出（基準時刻として使用）
            var roomJoinMatches = _onJoinedRoomPattern.Matches(logContent);
            if (roomJoinMatches.Count > 0)
            {
                var lastJoin = roomJoinMatches[roomJoinMatches.Count - 1];
                if (lastJoin.Groups.Count >= 2)
                {
                    string joinTimeString = lastJoin.Groups[1].Value;
                    
                    if (DateTime.TryParse(joinTimeString, out DateTime joinTime))
                    {
                        // インスタンス参加ログの後に発生したOnJoinedRoomのみを考慮
                        if (joinTime > lastInstanceJoinTime)
                        {
                            Console.WriteLine($"[DEBUG] OnJoinedRoom検出: 時刻: {joinTime}");
                            // 部屋参加が確認できたら、より正確なタイムスタンプとして使用
                            worldChangeTime = joinTime;
                            _lastWorldChangeTime = joinTime;
                            _lastRoomJoinTime = joinTime; // 明示的なルーム参加時間の更新
                        }
                    }
                }
            }
            
            // ワールド変更を検出した場合、イベント発火とフレンドリストのクリア
            if (worldChanged)
            {
                // ワールド変更時にフレンドリストとタイムスタンプをクリア
                CurrentFriends.Clear();
                _playerJoinTimestamps.Clear();
                _activePlayers.Clear(); // アクティブプレイヤーリストもクリア
                
                Console.WriteLine($"[DEBUG] ワールド変更を検出してフレンドリストをクリア: {CurrentWorldName}, 時刻: {worldChangeTime}");
                
                // ワールド変更イベントを発火
                OnWorldChanged(new WorldChangedEventArgs(CurrentWorldName, CurrentWorldId));
            }
            
            return worldChangeTime;
        }
        
        /// <summary>
        /// ログエントリのタイムスタンプを取得
        /// </summary>
        private DateTime GetEntryTimestamp(string logContent, string entryText)
        {
            // デフォルト値として現在時刻を使用
            DateTime result = DateTime.Now;
            
            try
            {
                // エントリー行を検索
                int entryPos = logContent.LastIndexOf(entryText);
                if (entryPos < 0) return result;
                
                // エントリ行のある行の先頭を見つける
                int lineStart = logContent.LastIndexOf('\n', entryPos);
                if (lineStart < 0) lineStart = 0;
                else lineStart++; // 改行文字の次の文字から
                
                // 行の内容を抽出
                string line = logContent.Substring(lineStart, entryPos - lineStart + entryText.Length);
                
                // タイムスタンプを抽出
                var timeMatch = _timeStampLogPattern.Match(line);
                if (timeMatch.Success && timeMatch.Groups.Count > 1)
                {
                    string timeString = timeMatch.Groups[1].Value;
                    if (DateTime.TryParse(timeString, out DateTime parsedTime))
                    {
                        return parsedTime;
                    }
                }
            }
            catch (Exception ex)
            {
                // エラー時は現在時刻を返す
                Console.WriteLine($"[ERROR] タイムスタンプ取得エラー: {ex.Message}");
            }
            
            return result;
        }

        /// <summary>
        /// ログ内容からフレンドリストを抽出（ワールド変更のタイムスタンプを考慮）
        /// </summary>
        private void ExtractFriendsList(string logContent, DateTime worldChangeTime)
        {
            string instanceLog = ExtractCurrentInstanceLog(logContent, worldChangeTime);
            CurrentFriends = _userDetector.DetectRemoteUsers(instanceLog, worldChangeTime);
        }

        /// <summary>
        /// 現在のインスタンスに関連するログのみを抽出する
        /// </summary>
        private string ExtractCurrentInstanceLog(string logContent, DateTime worldChangeTime)
        {
            // 日時文字列の形式（例: 2025.03.19 11:07:23）
            string timeFormat = worldChangeTime.ToString("yyyy.MM.dd HH:mm:ss");
            
            // 時刻文字列をログから検索
            int startPosition = logContent.IndexOf(timeFormat);
            
            if (startPosition >= 0)
            {
                // 指定時刻以降のログを抽出
                return logContent.Substring(startPosition);
            }
            else
            {
                // 時刻が見つからない場合、別の方法で検出
                var allTimeEntries = _timeStampLogPattern.Matches(logContent);
                
                // 指定された時刻に最も近いログエントリを探す
                int closestIndex = -1;
                TimeSpan smallestDifference = TimeSpan.MaxValue;
                
                for (int i = 0; i < allTimeEntries.Count; i++)
                {
                    string timeString = allTimeEntries[i].Groups[1].Value;
                    if (DateTime.TryParse(timeString, out DateTime entryTime))
                    {
                        TimeSpan difference = (entryTime - worldChangeTime).Duration();
                        if (difference < smallestDifference)
                        {
                            smallestDifference = difference;
                            closestIndex = i;
                        }
                    }
                }
                
                // 最も近いエントリ以降のログを抽出
                if (closestIndex >= 0 && closestIndex < allTimeEntries.Count)
                {
                    Match closestEntry = allTimeEntries[closestIndex];
                    int position = closestEntry.Index;
                    
                    if (position >= 0)
                    {
                        return logContent.Substring(position);
                    }
                }
                
                // どれも見つからない場合は最後の20%のログを使用
                int cutPosition = (int)(logContent.Length * 0.8);
                return logContent.Substring(cutPosition);
            }
        }

        /// <summary>
        /// ログ内容からユーザー名を抽出
        /// </summary>
        private void ExtractUsername(string logContent)
        {
            Username = _userDetector.DetectLocalUser(logContent);
        }

        /// <summary>
        /// フレンドリストを指定の区切り文字で結合した文字列を取得（改良版）
        /// </summary>
        public string GetFriendsString(string separator = ".")
        {
            if (CurrentFriends == null || CurrentFriends.Count == 0)
            {
                return "ボッチ(だれもいません)";
            }
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
                { "Usernames", GetFriendsString() },
                
                // 撮影者情報
                { "User", Username }, // 'Username'を'User'に変更
                
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
        
        /// <summary>
        /// 現在のワールド情報をリセット（明示的なリセット処理）
        /// </summary>
        public void ResetWorldData()
        {
            CurrentWorldName = "Unknown World";
            CurrentWorldId = "";
            CurrentFriends.Clear();
            _playerJoinTimestamps.Clear();
            _lastWorldChangeTime = DateTime.MinValue;
            
            Console.WriteLine("[DEBUG] ワールド情報を明示的にリセットしました");
        }
        
        /// <summary>
        /// アプリケーション起動時の初期化処理（明示的な初期化メソッド）
        /// </summary>
        public void InitializeFromLatestLog()
        {
            // 現在の情報をリセット
            ResetWorldData();
            
            // 最新のログを解析
            if (ParseLatestLog())
            {
                Console.WriteLine("[DEBUG] アプリ起動初期化: ログ解析成功");
            }
            else
            {
                Console.WriteLine("[DEBUG] アプリ起動初期化: ログ解析失敗");
            }
        }

        /// <summary>
        /// ユーザー名比較のための拡張メソッドを追加
        /// </summary>
        private bool UsernameEquals(string name1, string name2)
        {
            if (string.IsNullOrEmpty(name1) || string.IsNullOrEmpty(name2))
            {
                Console.WriteLine($"[DEBUG] ユーザー名比較: 空の名前があります name1=「{name1}」, name2=「{name2}」");
                return false;
            }
            
            bool result = string.Equals(name1.Trim(), name2.Trim(), StringComparison.OrdinalIgnoreCase);
            Console.WriteLine($"[DEBUG] ユーザー名比較: 「{name1}」 vs 「{name2}」 結果={result}");
            return result;
        }

        /// <summary>
        /// ローカルユーザーかどうかを判定
        /// </summary>
        private bool IsLocalUser(string playerName)
        {
            // 大文字小文字を区別するように変更
            return string.Equals(playerName.Trim(), Username.Trim(), StringComparison.Ordinal);
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