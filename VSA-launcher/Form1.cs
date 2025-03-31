using System.Diagnostics; // Process関連の操作のため
using System.Text;
using System.Text.RegularExpressions;
using System.Drawing.Imaging;

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
        private ImageProcessor _imageProcessor = null!;
        private FolderStructureManager _folderManager = null!;
        private FileNameGenerator _fileNameGenerator = null!;
        private string _currentMetadataImagePath = string.Empty;

        // 設定ファイルから読み込んだスタートアップ設定
        private bool _startWithWindows = false;

        public VSA_launcher()
        {
            try
            {
                InitializeComponent();
                _settings = SettingsManager.LoadSettings();
                _systemTrayIcon = new SystemTrayIcon(this, notifyIcon, contextMenuStrip1);

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
                // PictureBoxクリックイベントの登録
                PngPreview_pictureBox.Click += PngPreview_pictureBox_Click;

                // ファイル名フォーマットのコンボボックス変更イベント追加
                if (fileRename_comboBox != null)
                {
                    fileRename_comboBox.SelectedIndexChanged += FileRename_ComboBox_SelectedIndexChanged;

                    // コンボボックスの初期化（値がまだ設定されていない場合）
                    if (fileRename_comboBox.Items.Count == 0)
                    {
                        InitializeFileRenameComboBox();
                    }
                }

                _logParser = new VRChatLogParser();

                System.Windows.Forms.Timer logUpdateTimer = new System.Windows.Forms.Timer();
                logUpdateTimer.Interval = 2000; // 2秒ごとに更新
                logUpdateTimer.Tick += (s, e) => 
                {
                    _logParser.ParseLatestLog();
                    
                    // ログを見に行った後、現在のフレンド情報をコンソールに出力
                    Debug.WriteLine($"[{DateTime.Now:yyyy.MM.dd HH:mm:ss}] 現在のインスタンス内ユーザー情報:");
                    
                    // フレンドリストを取得して出力
                    if (_logParser.CurrentFriends != null && _logParser.CurrentFriends.Any())
                    {
                        foreach (var friend in _logParser.CurrentFriends)
                        {
                            Debug.WriteLine($" - {friend}");
                        }
                    }
                    else
                    {
                        Debug.WriteLine(" - インスタンス内ユーザー情報なし");
                    }
                    
                    // 世界情報も出力
                    Debug.WriteLine("----------------------------------------");
                };
                logUpdateTimer.Start();
                
                // 画像プロセッサを初期化
                _folderManager = new FolderStructureManager(_settings);
                _fileNameGenerator = new FileNameGenerator(_settings);
                _imageProcessor = new ImageProcessor(_settings, _logParser, _fileWatcher, UpdateStatusInfo);

                // スタートアップ設定を適用
                _startWithWindows = _settings.LauncherSettings.StartWithWindows;
                startup_checkBox.Checked = _startWithWindows;

                // スタートアップの実際の状態を反映
                
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

        // ファイル名フォーマットコンボボックスの初期化
        private void InitializeFileRenameComboBox()
        {
            // コンボボックスに項目を追加
            fileRename_comboBox.Items.Clear();
            fileRename_comboBox.Items.Add("名前を変更しない"); // インデックス0
            fileRename_comboBox.Items.Add("年_月_日_時分_連番"); // インデックス1
            fileRename_comboBox.Items.Add("年月日_時分_連番"); // インデックス2
            fileRename_comboBox.Items.Add("年-月-日-曜日-時分-連番"); // インデックス3
            fileRename_comboBox.Items.Add("日-月-年-時分-連番"); // インデックス4
            fileRename_comboBox.Items.Add("月-日-年-時分-連番"); // インデックス5
            fileRename_comboBox.Items.Add("年.月.日.時分.連番"); // インデックス6
            fileRename_comboBox.Items.Add("時分_年月日_連番"); // インデックス7

            // 設定に基づいて選択項目を設定
            bool enabled = _settings.FileRenaming.Enabled;
            string format = _settings.FileRenaming.Format;

            int selectedIndex = 0; // デフォルトは「変更しない」

            if (enabled)
            {
                // フォーマットに基づいて適切なインデックスを選択
                switch (format)
                {
                    case "yyyy_MM_dd_HHmm_seq": selectedIndex = 1; break;
                    case "yyyyMMdd_HHmm_seq": selectedIndex = 2; break;
                    case "yyyy-MM-dd-ddd-HHmm-seq": selectedIndex = 3; break;
                    case "dd-MM-yyyy-HHmm-seq": selectedIndex = 4; break;
                    case "MM-dd-yyyy-HHmm-seq": selectedIndex = 5; break;
                    case "yyyy.MM.dd.HHmm.seq": selectedIndex = 6; break;
                    case "HHmm_yyyyMMdd_seq": selectedIndex = 7; break;
                    default: selectedIndex = 0; break;
                }
            }

            fileRename_comboBox.SelectedIndex = selectedIndex;

            // ラベル初期更新
            UpdateFileRenamePreviewLabel();
        }

        // コンボボックス変更イベントハンドラ
        private void FileRename_ComboBox_SelectedIndexChanged(object sender, EventArgs e)
        {
            // 選択されたインデックスに基づいて設定を更新
            int selectedIndex = fileRename_comboBox.SelectedIndex;

            // 名前変更が有効かどうか（0以外なら有効）
            _settings.FileRenaming.Enabled = (selectedIndex != 0);

            // フォーマットの更新
            switch (selectedIndex)
            {
                case 1: _settings.FileRenaming.Format = "yyyy_MM_dd_HHmm_seq"; break;
                case 2: _settings.FileRenaming.Format = "yyyyMMdd_HHmm_seq"; break;
                case 3: _settings.FileRenaming.Format = "yyyy-MM-dd-ddd-HHmm-seq"; break;
                case 4: _settings.FileRenaming.Format = "dd-MM-yyyy-HHmm-seq"; break;
                case 5: _settings.FileRenaming.Format = "MM-dd-yyyy-HHmm-seq"; break;
                case 6: _settings.FileRenaming.Format = "yyyy.MM.dd.HHmm.seq"; break;
                case 7: _settings.FileRenaming.Format = "HHmm_yyyyMMdd_seq"; break;
                default: _settings.FileRenaming.Format = ""; break;
            }

            // 設定を保存
            SettingsManager.SaveSettings(_settings);

            // プレビューラベルを更新
            UpdateFileRenamePreviewLabel();
        }

        // プレビューラベルの更新
        private void UpdateFileRenamePreviewLabel()
        {
            if (fileRename_label == null) return;

            // 選択されたインデックス
            int selectedIndex = fileRename_comboBox.SelectedIndex;

            if (selectedIndex == 0)
            {
                // 名前変更なしの場合
                fileRename_label.Text = "ファイル名はそのまま保持されます";
                return;
            }

            // フォーマットに基づくプレビューを生成
            string previewName = _fileNameGenerator.GeneratePreviewFileName(_settings.FileRenaming.Format);

            // ラベルに表示
            fileRename_label.Text = $"例: {previewName}";
        }

        private void Form1_Load(object sender, EventArgs e)
        {
            // 設定を読み込み、UIに反映
            ApplySettingsToUI();

            // スタートアップ設定の初期化
            InitializeStartupSetting();

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

            // ファイル名フォーマットのコンボボックスを更新
            if (fileRename_comboBox != null)
            {
                InitializeFileRenameComboBox();
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
        // publicに変更してSystemTrayIconからアクセスできるようにする
        public void LaunchMainApplication()
        {
            try
            {
                // メインアプリが既に実行中かどうかを確認
                if (IsMainAppRunning())
                {
                    MessageBox.Show(
                        "メインアプリは既に実行中です。",
                        "情報",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information);
                    return;
                }

                // フロントエンドのパスを探す - 複数の候補から探す
                string[] potentialFrontendPaths = new string[]
                {
                    // 開発パス
                    @"d:\programmstage\VSA\frontend",
                    
                    // 実行ファイルと同じディレクトリの隣の「frontend」ディレクトリ
                    Path.Combine(Path.GetDirectoryName(Application.ExecutablePath), "frontend"),
                    
                    // 実行ファイルの親ディレクトリの「frontend」ディレクトリ
                    Path.Combine(Path.GetDirectoryName(Application.ExecutablePath), "..", "frontend")
                };

                string frontendPath = null;
                foreach (string path in potentialFrontendPaths)
                {
                    if (Directory.Exists(path))
                    {
                        frontendPath = path;
                        break;
                    }
                }

                if (frontendPath == null)
                {
                    MessageBox.Show(
                        "メインアプリケーションフォルダが見つかりません。\n以下のパスを確認しました:\n" + 
                        string.Join("\n", potentialFrontendPaths),
                        "エラー",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error);
                    return;
                }

                // Electronアプリの直接起動方法（複数の候補から探す）
                string[] electronPaths = new string[]
                {
                    // node_modulesディレクトリからElectronを探す
                    Path.Combine(frontendPath, "node_modules", "electron", "dist", "electron.exe"),
                    
                    // node_modulesディレクトリから.binフォルダを探す
                    Path.Combine(frontendPath, "node_modules", ".bin", "electron.cmd"),
                    
                    // グローバルインストールしたElectron
                    @"C:\Program Files\nodejs\electron.exe"
                };

                string electronPath = null;
                foreach (string path in electronPaths)
                {
                    if (File.Exists(path))
                    {
                        electronPath = path;
                        break;
                    }
                }

                // main.jsファイルのパス
                string mainJsPath = Path.Combine(frontendPath, "electron", "main.js");
                
                // main.jsファイルが存在するか確認
                if (!File.Exists(mainJsPath))
                {
                    MessageBox.Show(
                        $"メインJSファイルが見つかりません: {mainJsPath}",
                        "エラー",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error);
                    return;
                }

                ProcessStartInfo startInfo;
                
                if (electronPath != null)
                {
                    // Electronが直接実行可能な場合、Electronを使用してmain.jsを起動
                    startInfo = new ProcessStartInfo
                    {
                        FileName = electronPath,
                        Arguments = $"\"{mainJsPath}\"",
                        WorkingDirectory = frontendPath,
                        UseShellExecute = true, // Windowsシェル経由で起動 (コンソールを表示するために変更)
                        CreateNoWindow = false  // コンソールウィンドウを表示する (デバッグ中は表示)
                    };
                }
                else
                {
                    // node.jsを使用してmain.jsを直接実行
                    string nodePath = "node.exe";
                    
                    startInfo = new ProcessStartInfo
                    {
                        FileName = nodePath,
                        Arguments = $"\"{mainJsPath}\"",
                        WorkingDirectory = frontendPath,
                        UseShellExecute = true,
                        CreateNoWindow = false
                    };
                }

                // アプリケーションフォルダにnodeモジュールのログファイルを作成（デバッグ用）
                string logPath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    "SnapArchiveKai",
                    "electron_launch.log");
                
                // アプリデータディレクトリがなければ作成
                Directory.CreateDirectory(Path.GetDirectoryName(logPath));
                
                // ログファイルにパス情報などを記録（デバッグ用）
                File.WriteAllText(logPath, 
                    $"Launch attempt: {DateTime.Now}\n" +
                    $"Frontend path: {frontendPath}\n" +
                    $"Electron path: {electronPath ?? "Not found"}\n" +
                    $"Main.js path: {mainJsPath}\n" +
                    $"Command: {startInfo.FileName} {startInfo.Arguments}\n"
                );

                // プロセスを起動
                Process.Start(startInfo);

                // 最後に起動状態を通知
                UpdateStatusInfo("メインアプリケーション起動中...", "起動処理中です");
                
                // 起動ボタンの状態を更新
                UpdateLaunchButtonState();
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"メインアプリケーションの起動に失敗しました。\n\nエラー詳細: {ex.Message}",
                    "エラー",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                UpdateStatusInfo("起動エラー", ex.Message);
            }
        }

        /// <summary>
        /// 起動ボタンの状態を更新
        /// </summary>
        private void UpdateLaunchButtonState()
        {
            bool isRunning = IsMainAppRunning();

            // UIスレッドでの実行を保証
            if (InvokeRequired)
            {
                BeginInvoke(new Action(UpdateLaunchButtonState));
                return;
            }

            // ボタンの状態を更新
            launchMainApp_button.Enabled = !isRunning;
            launchMainApp_button.Text = isRunning ? "アプリ実行中" : "アプリを起動する";

            // システムトレイのメニュー項目も更新
            メインアプリケーションを起動ToolStripMenuItem.Enabled = !isRunning;
            メインアプリケーションを起動ToolStripMenuItem.Text = isRunning ? "アプリ実行中" : "メインアプリケーションを起動";
        }

        private bool IsMainAppRunning()
        {
            try
            {
                // 専用のプロセス名で検索
                string[] exactProcessNames = new[] { "SnapArchiveKai", "VrcSnapArchive" };
                foreach (string processName in exactProcessNames)
                {
                    if (Process.GetProcessesByName(processName).Length > 0)
                    {
                        return true;
                    }
                }

                // Electronプロセスを検索し、起動引数をチェック
                Process[] electronProcesses = Process.GetProcessesByName("electron");
                if (electronProcesses.Length > 0)
                {
                    // 相互排他ロックファイルの存在確認
                    string lockFilePath = Path.Combine(
                        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                        "SnapArchiveKai",
                        ".app_running");

                    if (File.Exists(lockFilePath))
                    {
                        try
                        {
                            // ファイルの最終更新時間が5分以内なら実行中と判断
                            if ((DateTime.Now - File.GetLastWriteTime(lockFilePath)).TotalMinutes < 5)
                            {
                                return true;
                            }
                        }
                        catch
                        {
                            // ファイルアクセスエラーは無視
                        }
                    }

                    // お互いに排他的なミューテックス名を使用（アプリケーション間で共有）
                    bool createdNew;
                    using (var mutex = new Mutex(false, "SnapArchiveKaiRunningInstance", out createdNew))
                    {
                        // ミューテックスがすでに存在する（獲得できない）なら実行中
                        if (!createdNew && !mutex.WaitOne(0))
                        {
                            return true;
                        }

                        if (!createdNew)
                        {
                            mutex.ReleaseMutex();
                        }
                    }
                }

                return false;
            }
            catch
            {
                // 例外発生時は安全のため実行していないと判断
                return false;
            }
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

            // 監視開始前に一旦停止
            _fileWatcher.StopWatching();

            // ディレクトリが存在するか確認
            if (!Directory.Exists(_settings.ScreenshotPath))
            {
                UpdateStatusInfo("監視エラー", $"指定されたフォルダが見つかりません: {_settings.ScreenshotPath}");
                return;
            }

            // 月別フォルダ構造を検出し、適切な監視方法を選択
            bool success = _fileWatcher.StartWatching(_settings.ScreenshotPath);

            if (success)
            {
                if (_fileWatcher.CurrentMonthFolder != null)
                {
                    // 月別フォルダ監視が自動的に開始された
                    UpdateStatusInfo("月別フォルダ監視開始",
                        $"親フォルダ: {_settings.ScreenshotPath}, 現在の月: {Path.GetFileName(_fileWatcher.CurrentMonthFolder)}");
                }
                else
                {
                    // 通常の単一フォルダ監視
                    UpdateStatusInfo("監視開始", $"フォルダ: {_settings.ScreenshotPath}");
                }
            }
            else
            {
                UpdateStatusInfo("監視開始失敗", "フォルダの監視を開始できませんでした");
            }
        }

        private void FileWatcher_StatusChanged(object? sender, StatusChangedEventArgs e)
        {
            // UIスレッドでの実行を保証
            if (InvokeRequired)
            {
                BeginInvoke(new Action(() => FileWatcher_StatusChanged(sender, e)));
                return;
            }

            UpdateStatusInfo(e.Message, $"監視: {_fileWatcher.DetectedFilesCount} 処理: {_fileWatcher.ProcessedFilesCount} エラー: {_fileWatcher.ErrorCount}");
        }

        private void FileWatcher_FileDetected(object? sender, FileDetectedEventArgs e)
        {
            // ファイルが検出されたときの処理
            // 実際の処理はバックグラウンドで
            Task.Run(() => ProcessFile(e.FilePath));
        }

        private void StatusUpdateTimer_Tick(object? sender, EventArgs e)
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
            _imageProcessor.ProcessImage(sourceFilePath);
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

        private void fileSubdivision_Group_Enter(object sender, EventArgs e)
        {

        }

        private void checkBox3_CheckedChanged_1(object sender, EventArgs e)
        {

        }

        private void メインアプリケーションを起動ToolStripMenuItem_Click(object sender, EventArgs e)
        {
            LaunchMainApplication();
        }

        private void launchMainApp_button_Click(object sender, EventArgs e)
        {
            LaunchMainApplication();
        }

        private void screenShotFile_textBox_TextChanged(object sender, EventArgs e)
        {

        }

        private void PngMetaDate_button_Click(object sender, EventArgs e)
        {
            // ファイルをオープンして選択したファイルの情報を表示
            OpenFileDialog openFileDialog = new OpenFileDialog();
            openFileDialog.Filter = "PNG画像|*.png|JPG画像|*.jpg;*.jpeg|すべてのファイル|*.*";
            openFileDialog.Title = "メタデータを表示する画像を選択";

            if (openFileDialog.ShowDialog() == DialogResult.OK)
            {
                PngMetaDate_textBox.Text = openFileDialog.FileName;

                // 選択した画像を表示してメタデータを解析
                DisplayImageAndMetadata(openFileDialog.FileName);
            }
        }

        // 画像をプレビューに表示し、メタデータを解析して表示するメソッド
        public void DisplayImageAndMetadata(string imagePath)
        {
            if (InvokeRequired)
            {
                BeginInvoke(new Action(() => DisplayImageAndMetadata(imagePath)));
                return;
            }

            try
            {
                _currentMetadataImagePath = imagePath;

                // 画像プレビューの表示
                if (PngPreview_pictureBox.Image != null)
                {
                    PngPreview_pictureBox.Image.Dispose();
                    PngPreview_pictureBox.Image = null;
                }

                // 画像ファイルが存在するか確認
                if (string.IsNullOrEmpty(imagePath) || !File.Exists(imagePath))
                {
                    UpdateStatusInfo("エラー", "ファイルが見つかりません");
                    return;
                }

                // 画像を読み込んで表示
                using (var stream = new FileStream(imagePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                {
                    PngPreview_pictureBox.Image = Image.FromStream(stream);
                    PngPreview_pictureBox.SizeMode = PictureBoxSizeMode.Zoom;
                }

                // メタデータの取得と表示
                Dictionary<string, string> metadata = MetadataAnalyzer.ReadMetadataFromImage(imagePath);
                DisplayMetadata(metadata);
            }
            catch (Exception ex)
            {
                UpdateStatusInfo("画像読み込みエラー", ex.Message);
            }
        }

        // メタデータをテキストボックスなどに表示
        private void DisplayMetadata(Dictionary<string, string> metadata)
        {
            // デバッグログ出力
            System.Diagnostics.Debug.WriteLine($"DisplayMetadata called with {metadata.Count} items");
            foreach (var pair in metadata)
            {
                System.Diagnostics.Debug.WriteLine($"  {pair.Key} = {pair.Value}");
            }

            // メタデータの表示をクリア
            worldName_richTextBox.Text = string.Empty;
            worldFriends_richTextBox.Text = string.Empty;
            photoTime_textBox.Text = string.Empty;
            photographName_textBox.Text = string.Empty;

            // メタデータを表示
            if (metadata.TryGetValue("WorldName", out string worldName))
            {
                worldName_richTextBox.Text = worldName;
            }

            if (metadata.TryGetValue("Usernames", out string usernames)) // 'Friends'を'Usernames'に変更
            {
                worldFriends_richTextBox.Text = usernames;
            }

            if (metadata.TryGetValue("CaptureTime", out string captureTime))
            {
                photoTime_textBox.Text = captureTime;
            }

            if (metadata.TryGetValue("User", out string user)) // 'Username'を'User'に変更
            {
                photographName_textBox.Text = user;
            }

            // メタデータの存在確認とステータス表示
            if (metadata.Count == 0)
            {
                UpdateStatusInfo("メタデータなし", "この画像にはVSAメタデータが含まれていません");
            }
            else
            {
                UpdateStatusInfo("メタデータ読み込み完了", $"{metadata.Count}項目のメタデータを読み込みました");
            }
        }

        // PictureBoxのクリックイベント - 画像を外部ビューアで開く
        private void PngPreview_pictureBox_Click(object sender, EventArgs e)
        {
            if (!string.IsNullOrEmpty(_currentMetadataImagePath) && File.Exists(_currentMetadataImagePath))
            {
                try
                {
                    // 画像ファイルをデフォルトのビューアで開く
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = _currentMetadataImagePath,
                        UseShellExecute = true
                    });
                }
                catch (Exception ex)
                {
                    UpdateStatusInfo("画像を開けませんでした", ex.Message);
                }
            }
        }

        // テスト画像作成ボタン用のコード
        private void CreateTestImage_button_Click(object sender, EventArgs e)
        {
            try
            {
                // テスト用メタデータ辞書
                var metadata = new Dictionary<string, string>
                {
                    { "VSACheck", "true" },
                    { "WorldName", "テストワールド名" },
                    { "WorldID", "wrld_test-world-id-123" },
                    { "User", "テストユーザー名" }, // 'Username'を'User'に変更
                    { "CaptureTime", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") },
                    { "Usernames", "ユーザー1, ユーザー2, ユーザー3, 日本語名前" },
                    { "TestKey", "これはテストです" }
                };

                // 保存先を選択
                SaveFileDialog saveDialog = new SaveFileDialog
                {
                    Filter = "PNG画像|*.png",
                    Title = "テスト画像の保存先を選択",
                    FileName = "test_metadata.png"
                };

                if (saveDialog.ShowDialog() != DialogResult.OK)
                    return;

                // テスト用の画像を作成
                using (Bitmap bmp = new Bitmap(400, 300))
                using (Graphics g = Graphics.FromImage(bmp))
                {
                    g.Clear(Color.White);

                    // 日本語のテキストを正しく表示
                    using (Font font = new Font("Yu Gothic UI", 20))
                    {
                        g.DrawString("メタデータテスト画像", font, Brushes.Black, new PointF(50, 120));
                    }

                    // 一時ファイルとして保存
                    string tempPath = Path.GetTempFileName() + ".png";
                    bmp.Save(tempPath, ImageFormat.Png);

                    // デバッグ情報を表示
                    StringBuilder logSb = new StringBuilder();
                    logSb.AppendLine("テストデータ:");
                    foreach (var entry in metadata)
                    {
                        logSb.AppendLine($"  {entry.Key}: {entry.Value}");
                    }
                    System.Diagnostics.Debug.WriteLine(logSb.ToString());

                    // PngMetadataManager を使ってメタデータを追加して保存
                    bool success = PngMetadataManager.AddMetadataToPng(tempPath, saveDialog.FileName, metadata);

                    // 一時ファイルの削除
                    try { File.Delete(tempPath); } catch { }

                    if (success)
                    {
                        // メタデータの検証
                        var pngMetadata = PngMetadataManager.ReadMetadataFromPng(saveDialog.FileName);

                        StringBuilder sb = new StringBuilder();
                        sb.AppendLine("テスト画像作成結果:");
                        sb.AppendLine($"保存先: {saveDialog.FileName}");
                        sb.AppendLine("");
                        sb.AppendLine($"PngMetadataManager (tEXtチャンク): {pngMetadata.Count}項目");
                        foreach (var pair in pngMetadata)
                        {
                            sb.AppendLine($"   {pair.Key}: {pair.Value}");
                        }

                        MessageBox.Show(sb.ToString(), "テスト画像作成成功", MessageBoxButtons.OK, MessageBoxIcon.Information);

                        // UIに表示
                        PngMetaDate_textBox.Text = saveDialog.FileName;
                        DisplayImageAndMetadata(saveDialog.FileName);
                    }
                    else
                    {
                        MessageBox.Show("テスト画像の作成に失敗しました。", "エラー", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"テスト画像作成エラー: {ex.Message}\n{ex.StackTrace}", "エラー", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void LICENSEOpenFolder_button_Click(object sender, EventArgs e)
        {
            try
            {
                // ライセンスフォルダのパスを取得
                string licenseFolderPath = Path.Combine(
                    AppDomain.CurrentDomain.BaseDirectory, 
                    "LICENSE");
                
                // フォルダが存在するか確認
                if (Directory.Exists(licenseFolderPath))
                {
                    // フォルダをエクスプローラーで開く
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = licenseFolderPath,
                        UseShellExecute = true
                    });
                    UpdateStatusInfo("ライセンスフォルダを開きました", $"パス: {licenseFolderPath}");
                }
                else
                {
                    MessageBox.Show(
                        "ライセンスフォルダが見つかりませんでした。\nパス: " + licenseFolderPath,
                        "エラー",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error);
                    UpdateStatusInfo("エラー", "ライセンスフォルダが見つかりませんでした");
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "ライセンスフォルダを開く際にエラーが発生しました。\n" + ex.Message,
                    "エラー",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                UpdateStatusInfo("エラー", "ライセンスフォルダを開けませんでした");
            }
        }

        private void worldFriends_label_Click(object sender, EventArgs e)
        {

        }

        /// <summary>
        /// スタートアップチェックボックスの変更イベントハンドラ
        /// </summary>
        private void startUp_checkBox_CheckedChanged(object sender, EventArgs e)
        {
            try
            {
                bool isChecked = startup_checkBox.Checked;
                bool success;

                if (isChecked)
                {
                    // スタートアップに登録
                    success = StartupManager.RegisterInStartup();
                    if (success)
                    {
                        _startWithWindows = true;
                        UpdateStatusInfo("設定", "Windowsスタートアップに登録しました");
                    }
                    else
                    {
                        startup_checkBox.Checked = false;
                        _startWithWindows = false;
                        UpdateStatusInfo("エラー", "スタートアップ登録に失敗しました");
                        MessageBox.Show(
                            "Windowsスタートアップへの登録に失敗しました。\n管理者権限で実行するか、別の方法をお試しください。",
                            "スタートアップ登録エラー",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Warning);
                    }
                }
                else
                {
                    // スタートアップから解除
                    success = StartupManager.RemoveFromStartup();
                    if (success)
                    {
                        _startWithWindows = false;
                        UpdateStatusInfo("設定", "Windowsスタートアップから解除しました");
                    }
                    else
                    {
                        startup_checkBox.Checked = true;
                        _startWithWindows = true;
                        UpdateStatusInfo("エラー", "スタートアップ解除に失敗しました");
                        MessageBox.Show(
                            "Windowsスタートアップからの解除に失敗しました。\n管理者権限で実行するか、別の方法をお試しください。",
                            "スタートアップ解除エラー",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Warning);
                    }
                }

                // 設定を保存
                if (_settings != null)
                {
                    _settings.LauncherSettings.StartWithWindows = _startWithWindows;
                    SettingsManager.SaveSettings(_settings);
                }
            }
            catch (Exception ex)
            {
                UpdateStatusInfo("エラー", "スタートアップ設定エラー");
                MessageBox.Show(
                    $"スタートアップ設定中にエラーが発生しました。\n{ex.Message}",
                    "エラー",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
            }
        }

        /// <summary>
        /// フォーム初期化時にスタートアップ状態を確認して反映
        /// </summary>
        private void InitializeStartupSetting()
        {
            // 現在のスタートアップ状態を確認
            _startWithWindows = StartupManager.IsRegisteredInStartup();
            
            // チェックボックスに反映（イベント発火させないようにする）
            startup_checkBox.CheckedChanged -= startUp_checkBox_CheckedChanged;
            startup_checkBox.Checked = _startWithWindows;
            startup_checkBox.CheckedChanged += startUp_checkBox_CheckedChanged;
            
            // 設定オブジェクトに反映
            if (_settings != null)
            {
                _settings.LauncherSettings.StartWithWindows = _startWithWindows;
            }
        }
    }

    public class SystemTrayIcon
    {
        private NotifyIcon _notifyIcon = null!;
        private ContextMenuStrip _contextMenu = null!;
        private VSA_launcher _mainForm;

        public SystemTrayIcon(VSA_launcher mainForm, NotifyIcon notifyIcon, ContextMenuStrip contextMenu)
        {
            _mainForm = mainForm;
            _notifyIcon = notifyIcon;
            _contextMenu = contextMenu;
            
            // NotifyIconにコンテキストメニューを設定
            _notifyIcon.ContextMenuStrip = _contextMenu;
            
            // イベントハンドラの設定
            _notifyIcon.DoubleClick += (sender, e) => ShowSettings();
            
            // メニューの各項目を調べて名前で見つける - より安全な方法
            foreach (ToolStripItem item in _contextMenu.Items)
            {
                if (item.Text == "設定")
                {
                    item.Click += (sender, e) => ShowSettings();
                }
                else if (item.Text == "終了")
                {
                    item.Click += (sender, e) => Application.Exit();
                }
            }
            
            // モニタリング処理を開始
            StartMainAppMonitoring();
        }
        public void LaunchMainApplication()
        {
            _mainForm.LaunchMainApplication();
        }

        private void ShowSettings()
        {
            _mainForm.Show();
            _mainForm.WindowState = FormWindowState.Normal;
            _mainForm.Activate();
        }

        private void StartMainAppMonitoring()
        {
            // メインアプリケーションの状態を監視するコード
            // 現在は実装されていないようです
        }

        public void Dispose()
        {
            // NotifyIconはフォームが所有しているので、ここでは何もしない
        }
    }
}