using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;
using System.Threading.Tasks;
using System.Threading;
using System.Text.RegularExpressions; // 追加
using System.Linq; // 追加

namespace VSA_launcher
{
    public partial class VSA_launcher : Form
    {
        private FolderBrowserDialog screenshotFolderBrowser = new FolderBrowserDialog();
        private FolderBrowserDialog outputFolderBrowser = new FolderBrowserDialog();
        private SystemTrayIcon _systemTrayIcon = null!;
        private AppSettings _settings = null!;
        private int _detectedFilesCount = 0;
        private int _processedFilesCount = 0;
        private int _errorCount = 0;
        private FileWatcherService _fileWatcher = null!;
        private System.Windows.Forms.Timer _statusUpdateTimer = null!;
        private readonly VRChatLogParser _logParser = null!;

        public VSA_launcher()
        {
            try
            {
                InitializeComponent();
                _settings = SettingsManager.LoadSettings();
                _systemTrayIcon = new SystemTrayIcon(this);
                
                // ファイル監視サービスの初期化 - 設定を渡す
                _fileWatcher = new FileWatcherService();
                _fileWatcher.StatusChanged += FileWatcher_StatusChanged;
                _fileWatcher.FileDetected += FileWatcher_FileDetected;  // 重複登録を削除

                // 以下、残りの初期化処理...
                _statusUpdateTimer = new System.Windows.Forms.Timer();
                _statusUpdateTimer.Interval = 3000; // 3秒ごとに更新
                _statusUpdateTimer.Tick += StatusUpdateTimer_Tick;
                _statusUpdateTimer.Start();

                launchMainApp_button.Click += (s, e) => LaunchMainApplication();
                metadataEnabled_checkBox.CheckedChanged += metadataEnabled_CheckedChanged;
                monthCompression_checkBox.CheckedChanged += monthCompression_CheckedChanged;
                monthRadio_Button.CheckedChanged += radioButton_CheckedChanged;
                weekRadio_Button.CheckedChanged += radioButton_CheckedChanged;
                dayRadio_Button.CheckedChanged += radioButton_CheckedChanged;
                fileSubdivision_checkBox.CheckedChanged += checkBox3_CheckedChanged;

                _logParser = new VRChatLogParser();

                // 1分ごとにログを再解析
                System.Windows.Forms.Timer logUpdateTimer = new System.Windows.Forms.Timer();
                logUpdateTimer.Interval = 60000; // 1分
                logUpdateTimer.Tick += (s, e) => _logParser.ParseLatestLog();
                logUpdateTimer.Start();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"アプリケーション初期化エラー: {ex.Message}\n\nスタックトレース: {ex.StackTrace}", 
                               "起動エラー", 
                               MessageBoxButtons.OK, 
                               MessageBoxIcon.Error);
                Application.Exit();
            }
        }

        private void Form1_Load(object sender, EventArgs e)
        {
            // 設定を読み込み、UIに反映
            ApplySettingsToUI();
            
            // 初期状態のステータス表示
            UpdateStatusInfo("アプリケーション初期化完了", "監視準備中...");
            
            // スクリーンショットフォルダが設定済みなら監視を開始
            if (!string.IsNullOrEmpty(_settings.ScreenshotPath) && Directory.Exists(_settings.ScreenshotPath))
            {
                StartWatching();
            }
            else
            {
                UpdateStatusInfo("監視未設定", "スクリーンショットフォルダを設定してください");
            }
        }

        private void ApplySettingsToUI()
        {
            // パス設定
            screenShotFile_textBox.Text = _settings.ScreenshotPath;
            outPut_textBox.Text = _settings.OutputPath;
            
            // チェックボックス
            metadataEnabled_checkBox.Checked = _settings.Metadata.Enabled;
            fileSubdivision_checkBox.Checked = _settings.FolderStructure.Enabled;
            monthCompression_checkBox.Checked = _settings.Compression.AutoCompress;
            
            // フォルダ分け設定（ラジオボタン）
            switch (_settings.FolderStructure.Type)
            {
                case "month":
                    monthRadio_Button.Checked = true;
                    break;
                case "week":
                    weekRadio_Button.Checked = true;
                    break;
                case "day":
                    dayRadio_Button.Checked = true;
                    break;
            }
            
            // フォルダ分けグループのUI状態
            fileSubdivision_Group.Enabled = fileSubdivision_checkBox.Checked;
        }

        private void screenShotFile_button_Click(object sender, EventArgs e)
        {
            if (screenshotFolderBrowser.ShowDialog() == DialogResult.OK)
            {
                screenShotFile_textBox.Text = screenshotFolderBrowser.SelectedPath;
                _settings.ScreenshotPath = screenshotFolderBrowser.SelectedPath;
                SettingsManager.SaveSettings(_settings);
                
                // フォルダ設定後に監視を開始
                StartWatching();
            }
        }
        private void outPut_button_Click(object sender, EventArgs e)
        {
            if (outputFolderBrowser.ShowDialog() == DialogResult.OK)
            {
                outPut_textBox.Text = outputFolderBrowser.SelectedPath;
                _settings.OutputPath = outputFolderBrowser.SelectedPath;
                SettingsManager.SaveSettings(_settings);
                
                // ステータス更新
                UpdateStatusInfo("出力先フォルダを設定しました", $"フォルダ: {_settings.OutputPath}");
            }
        }

        private void metadataEnabled_CheckedChanged(object sender, EventArgs e)
        {
            _settings.Metadata.Enabled = metadataEnabled_checkBox.Checked;
            SettingsManager.SaveSettings(_settings);
        }

        private void checkBox3_CheckedChanged(object sender, EventArgs e)
        {
            fileSubdivision_Group.Enabled = fileSubdivision_checkBox.Checked;
            _settings.FolderStructure.Enabled = fileSubdivision_checkBox.Checked;
            SettingsManager.SaveSettings(_settings);
        }

        private void monthCompression_CheckedChanged(object sender, EventArgs e)
        {
            _settings.Compression.AutoCompress = monthCompression_checkBox.Checked;
            SettingsManager.SaveSettings(_settings);
        }
        
        private void radioButton_CheckedChanged(object? sender, EventArgs e)
        {
            if (monthRadio_Button.Checked)
                _settings.FolderStructure.Type = "month";
            else if (weekRadio_Button.Checked)
                _settings.FolderStructure.Type = "week";
            else if (dayRadio_Button.Checked)
                _settings.FolderStructure.Type = "day";
                
            SettingsManager.SaveSettings(_settings);
        }
        
        // ステータス表示の更新
        public void UpdateStatusInfo(string statusMessage, string fileStatusMessage)
        {
            // UIスレッドでの実行を保証
            if (InvokeRequired)
            {
                BeginInvoke(new Action(() => UpdateStatusInfo(statusMessage, fileStatusMessage)));
                return;
            }
            
            startingState_toolStripStatusLabel.Text = statusMessage;
            fileStatus_toolStripStatusLabel1.Text = fileStatusMessage;
        }
        
        // 処理状態の更新
        public void UpdateProcessingStats(int detected, int processed, int errors)
        {
            _detectedFilesCount = detected;
            _processedFilesCount = processed;
            _errorCount = errors;
            
            // ファイル統計表示の更新
            UpdateStatusInfo($"監視中: {detected}ファイル", $"処理済: {processed} エラー: {errors}");
        }
        
        // メインアプリ起動
        private void LaunchMainApplication()
        {
            _systemTrayIcon.LaunchMainApplication();
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (e.CloseReason == CloseReason.UserClosing)
            {
                e.Cancel = true;
                Hide();
            }
            else
            {
                base.OnFormClosing(e);
            }
        }

        private void toolStripTextBox1_Click(object sender, EventArgs e)
        {
            // 何もしない
        }

        private void label1_Click(object sender, EventArgs e)
        {
            // 何もしない
        }

        private void StartWatching()
        {
            if (string.IsNullOrEmpty(_settings.ScreenshotPath))
            {
                UpdateStatusInfo("監視エラー", "スクリーンショットフォルダが設定されていません");
                return;
            }

            // 通常の単一フォルダ監視かどうかをチェック
            bool isMonthFolderStructure = IsMonthFolderStructure(_settings.ScreenshotPath);
            
            bool success;
            
            if (isMonthFolderStructure)
            {
                // 月別フォルダ構造を検出した場合、特別な監視を開始
                success = _fileWatcher.StartWatchingWithMonthFolders(_settings.ScreenshotPath);
                
                if (success)
                {
                    string currentMonthFolder = _fileWatcher.CurrentMonthFolder ?? "未検出";
                    UpdateStatusInfo("月別フォルダ監視開始", 
                        $"親フォルダ: {_settings.ScreenshotPath}, 現在の月: {Path.GetFileName(currentMonthFolder)}");
                }
            }
            else
            {
                // 通常の単一フォルダ監視
                success = _fileWatcher.StartWatching(_settings.ScreenshotPath);
                
                if (success)
                {
                    UpdateStatusInfo("監視開始", $"フォルダ: {_settings.ScreenshotPath}");
                }
            }
        }

        // フォルダ構造が月別かどうかを判定
        private bool IsMonthFolderStructure(string folderPath)
        {
            try
            {
                // 指定されたパス内のサブフォルダを取得
                string[] subFolders = Directory.GetDirectories(folderPath);
                
                // YYYY-MM 形式のフォルダが2つ以上あれば月別構造と判定
                int monthFormatFolders = subFolders
                    .Select(Path.GetFileName)
                    .Count(folder => Regex.IsMatch(folder ?? "", @"^\d{4}-\d{2}$"));
                    
                return monthFormatFolders >= 2;
            }
            catch
            {
                return false;
            }
        }

        private void FileWatcher_StatusChanged(object sender, StatusChangedEventArgs e)
        {
            // UIスレッドでの実行を保証
            if (InvokeRequired)
            {
                BeginInvoke(new Action(() => FileWatcher_StatusChanged(sender, e)));
                return;
            }
            
            UpdateStatusInfo(e.Message, $"監視: {_fileWatcher.DetectedFilesCount} 処理: {_fileWatcher.ProcessedFilesCount} エラー: {_fileWatcher.ErrorCount}");
        }

        private void FileWatcher_FileDetected(object sender, FileDetectedEventArgs e)
        {
            // ファイルが検出されたときの処理
            // 実際の処理はバックグラウンドで
            Task.Run(() => ProcessFile(e.FilePath));
        }

        private void StatusUpdateTimer_Tick(object sender, EventArgs e)
        {
            // 定期的なステータス更新
            if (_fileWatcher.IsWatching)
            {
                fileStatus_toolStripStatusLabel1.Text = 
                    $"監視: {_fileWatcher.DetectedFilesCount} 処理: {_fileWatcher.ProcessedFilesCount} エラー: {_fileWatcher.ErrorCount}";
            }
        }

        private void ProcessFile(string sourceFilePath)
        {
            try
            {
                // 出力先が設定されていない場合は、スクリーンショットフォルダ内にVRCSnapArchiveフォルダを作成
                if (string.IsNullOrEmpty(_settings.OutputPath))
                {
                    string vrcArchiveFolder = Path.Combine(_settings.ScreenshotPath, "VRCSnapArchive");
                    
                    // フォルダが存在しない場合は作成
                    if (!Directory.Exists(vrcArchiveFolder))
                    {
                        Directory.CreateDirectory(vrcArchiveFolder);
                    }
                    
                    // 設定を更新
                    _settings.OutputPath = vrcArchiveFolder;
                    SettingsManager.SaveSettings(_settings);
                    
                    // UI更新
                    BeginInvoke(new Action(() => {
                        outPut_textBox.Text = vrcArchiveFolder;
                        UpdateStatusInfo("出力先を自動設定", $"フォルダ: {vrcArchiveFolder}");
                    }));
                }


                // 既に処理済みのファイルをスキップ
                if (PngMetadataManager.IsProcessedFile(sourceFilePath))
                {
                    UpdateStatusInfo("スキップ", $"処理済みファイル: {Path.GetFileName(sourceFilePath)}");
                    return;
                }

                string fileName = Path.GetFileName(sourceFilePath);
                string destinationFolder = _settings.OutputPath;
                
                // フォルダ分けが有効な場合
                if (_settings.FolderStructure.Enabled)
                {
                    string subFolder;
                    DateTime now = DateTime.Now;
                    
                    // 分類タイプに応じてフォルダ名を決定
                    switch (_settings.FolderStructure.Type)
                    {
                        case "month":
                            subFolder = now.ToString("yyyy-MM");
                            break;
                        case "week":
                            // 週番号を取得（文化に依存）
                            int weekNum = System.Globalization.CultureInfo.CurrentCulture.Calendar.GetWeekOfYear(
                                now, System.Globalization.CalendarWeekRule.FirstDay, DayOfWeek.Monday);
                            subFolder = $"{now.Year}-W{weekNum:D2}";
                            break;
                        case "day":
                            subFolder = now.ToString("yyyy-MM-dd");
                            break;
                        default:
                            subFolder = now.ToString("yyyy-MM");
                            break;
                    }
                    
                    // サブフォルダのフルパス
                    destinationFolder = Path.Combine(_settings.OutputPath, subFolder);
                    
                    // フォルダが存在しない場合は作成
                    if (!Directory.Exists(destinationFolder))
                    {
                        Directory.CreateDirectory(destinationFolder);
                    }
                }
                
                // 最終的な出力先パス
                string destinationPath = Path.Combine(destinationFolder, fileName);
                
                // メタデータ付与はファイル移動前に行う必要がある
                if (_settings.Metadata.Enabled)
                {
                    // ログパーサーから最新情報を取得
                    _logParser.ParseLatestLog();
                    
                    // メタデータの作成
                    var metadata = new Dictionary<string, string>
                    {
                        { "WorldName", _logParser.CurrentWorldName ?? "Unknown" },
                        { "WorldID", _logParser.CurrentWorldId ?? "Unknown" },
                        { "CaptureTime", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") },
                        { "VSA", "true" } // 処理済みフラグを追加
                    };
                    
                    // FileWatcherServiceのProcessFileメソッドを呼び出すように修正
                    _fileWatcher.ProcessFile(sourceFilePath, destinationPath);
                    
                    // メタデータを直接PNGに書き込む
                    if (Path.GetExtension(destinationPath).ToLower() == ".png")
                    {
                        PngMetadataManager.WriteMetadata(destinationPath, metadata);
                    }
                }
                else
                {
                    // メタデータ無効の場合は直接コピー
                    File.Copy(sourceFilePath, destinationPath, true);
                }
                
                // UI更新（最後の処理情報などを表示）
                BeginInvoke(new Action(() => {
                    UpdateStatusInfo("処理完了", $"最新: {Path.GetFileName(destinationPath)}");
                }));
            }
            catch (Exception ex)
            {
                // エラー処理
                BeginInvoke(new Action(() => {
                    UpdateStatusInfo("処理エラー", ex.Message);
                }));
            }
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                _fileWatcher?.Dispose();
                _statusUpdateTimer?.Dispose();
                _systemTrayIcon?.Dispose();
                components?.Dispose();
            }
            base.Dispose(disposing);
        }
    }

    public class SystemTrayIcon
    {
        private NotifyIcon _notifyIcon = null!;
        private ContextMenuStrip _contextMenu = null!;
        private VSA_launcher _mainForm;

        public SystemTrayIcon(VSA_launcher mainForm)
        {
            _mainForm = mainForm;
            InitializeContextMenu();
            InitializeNotifyIcon();
        }

        private void InitializeContextMenu()
        {
            _contextMenu = new ContextMenuStrip();

            // メインアプリ起動メニュー項目
            ToolStripMenuItem launchMainItem = new ToolStripMenuItem("メインアプリ起動");
            launchMainItem.Click += (sender, e) => LaunchMainApplication();

            // 設定メニュー項目
            ToolStripMenuItem settingsItem = new ToolStripMenuItem("設定");
            settingsItem.Click += (sender, e) => ShowSettings();

            // 終了メニュー項目
            ToolStripMenuItem exitItem = new ToolStripMenuItem("終了");
            exitItem.Click += (sender, e) => Application.Exit();

            // メニューに項目を追加
            _contextMenu.Items.Add(launchMainItem);
            _contextMenu.Items.Add(settingsItem);
            _contextMenu.Items.Add(new ToolStripSeparator());
            _contextMenu.Items.Add(exitItem);
        }

        private void InitializeNotifyIcon()
        {
            _notifyIcon = new NotifyIcon
            {
                Icon = SystemIcons.Application, // 適切なアイコンに変更する
                Text = "VRC SnapArchive",
                ContextMenuStrip = _contextMenu,
                Visible = true
            };

            // アイコンダブルクリック時の動作
            _notifyIcon.DoubleClick += (sender, e) => ShowSettings();
        }

        public void LaunchMainApplication()
        {
            // メインアプリケーション（Electron）の起動処理
            try
            {
                string appPath = Path.Combine(
                    AppDomain.CurrentDomain.BaseDirectory,
                    "frontend",
                    "SnapArchiveKai.exe");

                if (File.Exists(appPath))
                {
                    System.Diagnostics.Process.Start(appPath, "--launched-from-launcher");
                    // フォームを隠す
                    _mainForm.Hide();

                    // メインアプリのプロセス監視を開始
                    StartMainAppMonitoring();
                }
                else
                {
                    MessageBox.Show(
                        "メインアプリケーションが見つかりません。",
                        "エラー",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"メインアプリケーションの起動に失敗しました: {ex.Message}",
                    "エラー",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
            }
        }

        private void ShowSettings()
        {
            // 設定画面を表示
            _mainForm.Show();
            _mainForm.WindowState = FormWindowState.Normal;
            _mainForm.Activate();
        }

        private void StartMainAppMonitoring()
        {
            // メインアプリのプロセス監視（別スレッドで実行）
            Task.Run(() =>
            {
                // 再起動フラグファイルのパス
                string flagFilePath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    "SnapArchiveKai",
                    ".launcher_reactivate");

                while (true)
                {
    // フラグファイルが存在するか確認
    if (File.Exists(flagFilePath))
    {
        try
        {
            // フラグファイルを削除
            File.Delete(flagFilePath);

            // UIスレッドでフォームを表示
            _mainForm.Invoke(new MethodInvoker(() => {
                _mainForm.Show();
                _mainForm.WindowState = FormWindowState.Normal;
                _mainForm.Activate();
            }));
            // 監視終了
            break;
        }
        catch (Exception)
        {
            // ファイル削除に失敗した場合は少し待つ 
            System.Threading.Thread.Sleep(1000);
        }
    }

    // 1秒ごとに確認
    System.Threading.Thread.Sleep(1000);
                    }
                });
            }

            public void Dispose()
            {
                _notifyIcon.Dispose();
            }
        }
    }
