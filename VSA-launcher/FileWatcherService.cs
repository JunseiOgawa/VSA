using System;
using System.IO;
using System.Threading.Tasks;
using System.Text.RegularExpressions;
using System.Collections.Generic;
using System.Linq;
using Hjg.Pngcs;
using Hjg.Pngcs.Chunks;

namespace VSA_launcher
{
    /// <summary>
    /// スクリーンショットの自動検知と処理を行うサービスクラス
    /// </summary>
    public class FileWatcherService : IDisposable
    {
        // ファイル監視関連
        private FileSystemWatcher? _watcher;
        private readonly string _fileExtension = "*.png";
        private bool _isWatching = false;
        private string? _targetFolder;
        private string? _currentMonthFolder;

        // 設定
        private readonly AppSettings _settings;

        // VRChatログ解析
        private readonly VRChatLogParser _logParser;
        
        // メタデータ処理用のキー
        private const string PROCESSED_KEY = "VSACheck";
        
        // 統計情報
        public int DetectedFilesCount { get; private set; } = 0;
        public int ProcessedFilesCount { get; private set; } = 0;
        public int ErrorCount { get; private set; } = 0;

        // 状態プロパティ
        public bool IsWatching => _isWatching;
        public string? CurrentWatchPath => _targetFolder;
        public string? CurrentMonthFolder => _currentMonthFolder;
        
        // 現在のワールド情報
        public string CurrentWorldName => _logParser.CurrentWorldName;
        public string CurrentWorldId => _logParser.CurrentWorldId;
        public List<string> CurrentFriends => _logParser.CurrentFriends;

        // イベント
        public event EventHandler<FileDetectedEventArgs>? FileDetected;
        public event EventHandler<StatusChangedEventArgs>? StatusChanged;

        /// <summary>
        /// コンストラクタ - 設定を読み込み、ログ解析機能を初期化
        /// </summary>
        public FileWatcherService()
        {
            // 設定を読み込み
            _settings = SettingsManager.LoadSettings();
            
            // VRChatログ解析機能を初期化
            _logParser = new VRChatLogParser();
            
            // 初回のログ解析を実行
            Task.Run(() => _logParser.ParseLatestLog());
        }
        
        /// <summary>
        /// 設定を更新するメソッド
        /// </summary>
        /// <param name="settings">新しい設定</param>
        public void UpdateSettings(AppSettings settings)
        {
            // 設定を更新
            bool wasWatching = _isWatching;
            string? oldPath = _targetFolder;
            
            // 一時的に監視を停止
            if (wasWatching)
            {
                StopWatching();
            }
            
            // 設定を更新
            _settings.ScreenshotPath = settings.ScreenshotPath;
            _settings.OutputPath = settings.OutputPath;
            _settings.FolderStructure = settings.FolderStructure;
            _settings.FileRenaming = settings.FileRenaming;
            _settings.Metadata = settings.Metadata;
            _settings.Compression = settings.Compression;
            
            // 監視していた場合は再開
            if (wasWatching && !string.IsNullOrEmpty(oldPath))
            {
                StartWatching(oldPath);
            }
        }

        /// <summary>
        /// 通常のフォルダ監視を開始
        /// </summary>
        /// <param name="folderPath">監視対象フォルダのパス</param>
        /// <returns>監視開始が成功したかどうか</returns>
        public bool StartWatching(string folderPath)
        {
            if (string.IsNullOrEmpty(folderPath) || !Directory.Exists(folderPath))
            {
                RaiseStatusChanged("監視エラー: 無効なフォルダパスです");
                return false;
            }

            try
            {
                StopWatching(); // 既存の監視があれば停止

                _watcher = new FileSystemWatcher
                {
                    Path = folderPath,
                    Filter = _fileExtension,
                    NotifyFilter = NotifyFilters.FileName | NotifyFilters.LastWrite,
                    EnableRaisingEvents = true
                };

                _watcher.Created += OnFileCreated;
                _isWatching = true;
                _targetFolder = folderPath;
                
                RaiseStatusChanged($"監視中: {folderPath}");
                return true;
            }
            catch (Exception ex)
            {
                _isWatching = false;
                ErrorCount++;
                RaiseStatusChanged($"監視エラー: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// 月別フォルダ構造で監視を開始
        /// </summary>
        /// <param name="rootPath">監視対象のルートフォルダパス</param>
        /// <returns>監視開始が成功したかどうか</returns>
        public bool StartWatchingWithMonthFolders(string rootPath)
        {
            if (string.IsNullOrEmpty(rootPath) || !Directory.Exists(rootPath))
            {
                RaiseStatusChanged("監視エラー: 無効なフォルダパスです");
                return false;
            }

            try
            {
                StopWatching(); // 既存の監視があれば停止

                // 現在の月フォルダを検出
                string[] folders = Directory.GetDirectories(rootPath);
                string currentYearMonth = DateTime.Now.ToString("yyyy-MM");
                
                _currentMonthFolder = folders.FirstOrDefault(f => 
                    Path.GetFileName(f).Equals(currentYearMonth, StringComparison.OrdinalIgnoreCase));

                // 現在の月フォルダが存在しない場合は作成
                if (_currentMonthFolder == null)
                {
                    _currentMonthFolder = Path.Combine(rootPath, currentYearMonth);
                    Directory.CreateDirectory(_currentMonthFolder);
                }
                
                _watcher = new FileSystemWatcher
                {
                    Path = _currentMonthFolder,
                    Filter = _fileExtension,
                    NotifyFilter = NotifyFilters.FileName | NotifyFilters.LastWrite,
                    EnableRaisingEvents = true
                };

                _watcher.Created += OnFileCreated;
                _isWatching = true;
                _targetFolder = rootPath;
                
                RaiseStatusChanged($"月別監視中: {_currentMonthFolder}");
                return true;
            }
            catch (Exception ex)
            {
                _isWatching = false;
                ErrorCount++;
                RaiseStatusChanged($"監視エラー: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// 監視の停止
        /// </summary>
        public void StopWatching()
        {
            if (_watcher != null)
            {
                _watcher.Created -= OnFileCreated;
                _watcher.EnableRaisingEvents = false;
                _watcher.Dispose();
                _watcher = null;
            }
            
            _isWatching = false;
            _targetFolder = null;
            RaiseStatusChanged("監視停止中");
        }

        /// <summary>
        /// ファイル作成イベントハンドラ
        /// </summary>
        private void OnFileCreated(object sender, FileSystemEventArgs e)
        {
            var filePath = e.FullPath;
            Task.Run(() => ProcessNewFile(filePath));
        }

        /// <summary>
        /// 新規ファイルの処理（非同期）
        /// </summary>
        private async Task ProcessNewFile(string filePath)
        {
            DetectedFilesCount++;
            RaiseStatusChanged($"ファイル検出: {Path.GetFileName(filePath)}");

            try
            {
                // ファイルのロック解除を待機
                await WaitForFileAccess(filePath);
                
                // PNGファイルではない場合はスキップ
                if (!IsPngFile(filePath))
                {
                    RaiseStatusChanged($"非対応ファイル形式: {Path.GetFileName(filePath)}");
                    return;
                }
                
                // 処理済みファイルかチェック
                if (IsProcessedFile(filePath))
                {
                    RaiseStatusChanged($"処理済みファイルをスキップ: {Path.GetFileName(filePath)}");
                    return;
                }
                
                // ファイル検出イベント発火
                RaiseFileDetected(filePath);
                
                // 出力先パスを計算
                string destinationPath = GetTargetPath(filePath);
                
                // メタデータ付きのファイル処理
                ProcessFile(filePath, destinationPath);
                
                ProcessedFilesCount++;
                RaiseStatusChanged($"処理完了: {Path.GetFileName(destinationPath)}");
            }
            catch (Exception ex)
            {
                ErrorCount++;
                RaiseStatusChanged($"処理エラー: {ex.Message}");
            }
        }

        /// <summary>
        /// ファイル処理（メタデータ付与とファイルコピー）
        /// </summary>
        public void ProcessFile(string sourceFilePath, string destinationPath)
        {
            try
            {
                // 出力先フォルダが存在しない場合は作成
                string? destinationDir = Path.GetDirectoryName(destinationPath);
                if (!string.IsNullOrEmpty(destinationDir) && !Directory.Exists(destinationDir))
                {
                    Directory.CreateDirectory(destinationDir);
                }
                
                // メタデータ機能が有効かつPNGファイルの場合
                if (_settings.Metadata.Enabled && IsPngFile(sourceFilePath))
                {
                    // 最新のログ情報を取得
                    _logParser.ParseLatestLog();
                    
                    // メタデータの生成
                    var metadata = new Dictionary<string, string>
                    {
                        // 処理済みマーカー
                        { PROCESSED_KEY, "true" },
                        
                        // ワールド情報
                        { "WorldName", _logParser.CurrentWorldName ?? "Unknown World" },
                        { "WorldID", _logParser.CurrentWorldId ?? "Unknown" },
                        
                        // フレンド情報（.区切り）
                        { "Friends", string.Join(".", _logParser.CurrentFriends) },
                        
                        // 撮影日時
                        { "CaptureTime", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") }
                    };
                    
                    // PngMetadataManagerを使用してメタデータを追加
                    bool success = PngMetadataManager.AddMetadataToPng(sourceFilePath, destinationPath, metadata);
                    
                    if (!success)
                    {
                        // メタデータ追加に失敗した場合は通常のコピー
                        File.Copy(sourceFilePath, destinationPath, true);
                        RaiseStatusChanged($"メタデータ追加失敗: {Path.GetFileName(sourceFilePath)}");
                    }
                }
                else
                {
                    // メタデータ処理が無効またはPNG以外の場合は単純コピー
                    File.Copy(sourceFilePath, destinationPath, true);
                }
                
                // 処理済みファイル数の更新
                ProcessedFilesCount++;
            }
            catch (Exception ex)
            {
                ErrorCount++;
                RaiseStatusChanged($"ファイル処理エラー: {ex.Message}");
                throw; // 呼び出し元でエラー処理ができるよう例外を再スロー
            }
        }

        /// <summary>
        /// ファイル処理（外部提供のメタデータを使用）
        /// </summary>
        /// <param name="sourceFilePath">元ファイルパス</param>
        /// <param name="destinationPath">出力先パス</param>
        /// <param name="customMetadata">カスタムメタデータ</param>
        public void ProcessFile(string sourceFilePath, string destinationPath, Dictionary<string, string> customMetadata)
        {
            try
            {
                // 出力先フォルダが存在しない場合は作成
                string? destinationDir = Path.GetDirectoryName(destinationPath);
                if (!string.IsNullOrEmpty(destinationDir) && !Directory.Exists(destinationDir))
                {
                    Directory.CreateDirectory(destinationDir);
                }
                
                // メタデータ機能が有効かつPNGファイルの場合
                if (_settings.Metadata.Enabled && IsPngFile(sourceFilePath))
                {
                    // 処理済みマーカーの追加（なければ）
                    if (!customMetadata.ContainsKey(PROCESSED_KEY))
                    {
                        customMetadata[PROCESSED_KEY] = "true";
                    }
                    
                    // PngMetadataManagerを使用してメタデータを追加
                    bool success = PngMetadataManager.AddMetadataToPng(sourceFilePath, destinationPath, customMetadata);
                    
                    if (!success)
                    {
                        // メタデータ追加に失敗した場合は通常のコピー
                        File.Copy(sourceFilePath, destinationPath, true);
                        RaiseStatusChanged($"メタデータ追加失敗: {Path.GetFileName(sourceFilePath)}");
                    }
                }
                else
                {
                    // メタデータ処理が無効またはPNG以外の場合は単純コピー
                    File.Copy(sourceFilePath, destinationPath, true);
                }
                
                // 処理済みファイル数の更新
                ProcessedFilesCount++;
            }
            catch (Exception ex)
            {
                ErrorCount++;
                RaiseStatusChanged($"ファイル処理エラー: {ex.Message}");
                throw; // 呼び出し元でエラー処理ができるよう例外を再スロー
            }
        }

        /// <summary>
        /// 出力先パスを計算（フォルダ構造に基づく）
        /// </summary>
        public string GetTargetPath(string filePath)
        {
            if (!_settings.FolderStructure.Enabled || string.IsNullOrEmpty(_settings.OutputPath))
            {
                return filePath;
            }

            // 出力先ディレクトリの決定
            string fileName = Path.GetFileName(filePath);
            string outputDir = _settings.OutputPath;
            
            // ファイル日時を取得
            DateTime fileDate = File.GetCreationTime(filePath);
            
            // フォルダ分けが有効な場合はサブフォルダを決定
            if (_settings.FolderStructure.Enabled)
            {
                string subFolder = "";
                
                // フォルダ構造に応じたサブフォルダ名
                switch (_settings.FolderStructure.Type.ToLower())
                {
                    case "month":
                        subFolder = fileDate.ToString("yyyy-MM");
                        break;
                    case "week":
                        // ISO 8601準拠の週番号
                        var cal = System.Globalization.CultureInfo.InvariantCulture.Calendar;
                        int weekNum = cal.GetWeekOfYear(
                            fileDate, 
                            System.Globalization.CalendarWeekRule.FirstFourDayWeek, 
                            DayOfWeek.Monday);
                        subFolder = $"{fileDate.Year}-W{weekNum:D2}";
                        break;
                    case "day":
                        subFolder = fileDate.ToString("yyyy-MM-dd");
                        break;
                    default:
                        subFolder = fileDate.ToString("yyyy-MM");
                        break;
                }
                
                outputDir = Path.Combine(outputDir, subFolder);
            }
            
            // ファイル名変更が有効な場合
            if (_settings.FileRenaming.Enabled)
            {
                string newFileName = GenerateFileName(fileDate, _settings.FileRenaming.Format);
                fileName = newFileName + Path.GetExtension(filePath);
            }
            
            // 出力先ディレクトリが存在しなければ作成
            if (!Directory.Exists(outputDir))
            {
                Directory.CreateDirectory(outputDir);
            }
            
            return Path.Combine(outputDir, fileName);
        }
        
        /// <summary>
        /// ファイル名生成（フォーマットに基づく）
        /// </summary>
        private string GenerateFileName(DateTime dateTime, string format)
        {
            // フォーマットに日付を適用
            string fileName = dateTime.ToString(format);
            
            // 曜日表示がある場合は置き換え
            if (format.Contains("曜日"))
            {
                string[] dayOfWeekJp = { "日", "月", "火", "水", "木", "金", "土" };
                fileName = fileName.Replace("曜日", dayOfWeekJp[(int)dateTime.DayOfWeek]);
            }
            
            // 連番処理
            if (format.Contains("連番"))
            {
                string baseFileName = fileName.Replace("連番", "");
                int counter = 1;
                
                // 出力フォルダ内で同じ基本ファイル名のファイル数をカウント
                if (Directory.Exists(_settings.OutputPath))
                {
                    var existingFiles = Directory.GetFiles(_settings.OutputPath, baseFileName + "*.*", SearchOption.AllDirectories);
                    counter = existingFiles.Length + 1;
                }
                
                // 連番を3桁の数字で置換
                fileName = fileName.Replace("連番", counter.ToString("D3"));
            }
            
            return fileName;
        }

        /// <summary>
        /// ファイルがPNGフォーマットかどうかを確認
        /// </summary>
        private bool IsPngFile(string filePath)
        {
            return Path.GetExtension(filePath).Equals(".png", StringComparison.OrdinalIgnoreCase);
        }
        
        /// <summary>
        /// ファイルが処理済み（VSACheckタグがある）かどうかを確認
        /// </summary>
        private bool IsProcessedFile(string filePath)
        {
            try
            {
                // PngMetadataManagerを使用
                var metadata = PngMetadataManager.ReadMetadata(filePath);
                return metadata.ContainsKey(PROCESSED_KEY) && metadata[PROCESSED_KEY] == "true";
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// ファイルのロック解除を待機（ファイルが完全に書き込まれるまで）
        /// </summary>
        private async Task WaitForFileAccess(string filePath, int maxAttempts = 10)
        {
            int attempts = 0;
            bool fileAvailable = false;

            while (!fileAvailable && attempts < maxAttempts)
            {
                try
                {
                    // ファイルを読み取り専用で開いてみる（ロックされていないかテスト）
                    using (FileStream fs = File.Open(filePath, FileMode.Open, FileAccess.Read, FileShare.None))
                    {
                        fileAvailable = true;
                    }
                }
                catch
                {
                    // ファイルがロックされている場合は待機
                    attempts++;
                    await Task.Delay(500); // 500ミリ秒待機
                }
            }

            if (!fileAvailable)
            {
                throw new TimeoutException($"ファイル {Path.GetFileName(filePath)} へのアクセスがタイムアウトしました");
            }
        }
        
        // イベント発火メソッド
        private void RaiseFileDetected(string filePath)
        {
            FileDetected?.Invoke(this, new FileDetectedEventArgs(filePath));
        }

        private void RaiseStatusChanged(string message)
        {
            StatusChanged?.Invoke(this, new StatusChangedEventArgs(message));
        }

        // リソース解放
        public void Dispose()
        {
            StopWatching();
        }
    }

    /// <summary>
    /// ファイル検出イベント引数
    /// </summary>
    public class FileDetectedEventArgs : EventArgs
    {
        public string FilePath { get; }
        
        public FileDetectedEventArgs(string filePath)
        {
            FilePath = filePath;
        }
    }

    /// <summary>
    /// ステータス変更イベント引数
    /// </summary>
    public class StatusChangedEventArgs : EventArgs
    {
        public string Message { get; }
        
        public StatusChangedEventArgs(string message)
        {
            Message = message;
        }
    }
}