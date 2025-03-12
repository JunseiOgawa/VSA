using System.Diagnostics; // Process関連の操作のため
using System.Text.RegularExpressions;

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

                // 1分ごとにログを再解析
                System.Windows.Forms.Timer logUpdateTimer = new System.Windows.Forms.Timer();
                logUpdateTimer.Interval = 60000; // 1分
                logUpdateTimer.Tick += (s, e) => _logParser.ParseLatestLog();
                logUpdateTimer.Start();

                // 画像プロセッサを初期化
                _folderManager = new FolderStructureManager(_settings);
                _fileNameGenerator = new FileNameGenerator(_settings);
                _imageProcessor = new ImageProcessor(_settings, _logParser, _fileWatcher, UpdateStatusInfo);
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
            // 起動前にアプリが既に実行中かチェック
            if (IsMainAppRunning())
            {
                MessageBox.Show("メインアプリケーションは既に実行中です。", 
                                "情報", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }
            
            try
            {
                string currentDirectory = AppDomain.CurrentDomain.BaseDirectory;
                string solutionRoot = Path.GetFullPath(Path.Combine(currentDirectory, @"..\..\..")); 
                
                // デバッグモードかどうかを確認
                bool isDebugMode = false;
                #if DEBUG
                    isDebugMode = true;
                #endif
                
                // frontendディレクトリのパス - プロジェクトと同階層の"frontend"ディレクトリを指定
                string frontendPath = Path.Combine(
                    Path.GetDirectoryName(Path.GetDirectoryName(solutionRoot)), // ソリューションの2階層上に移動
                    "frontend"
                );
                
                // frontendディレクトリが存在しない場合は、カレントディレクトリの隣の"frontend"も試す
                if (!Directory.Exists(frontendPath))
                {
                    frontendPath = Path.Combine(
                        Path.GetDirectoryName(solutionRoot), // ソリューションの1階層上に移動
                        "frontend"
                    );
                }
                
                // それでも見つからない場合は、一般的な場所を試す
                if (!Directory.Exists(frontendPath))
                {
                    frontendPath = Path.Combine(Directory.GetCurrentDirectory(), "frontend");
                }
                
                // 最終確認 - フロントエンドディレクトリが存在するか確認
                if (!Directory.Exists(frontendPath))
                {
                    MessageBox.Show($"フロントエンドディレクトリが見つかりません。\n以下のパスを確認してください:\n{frontendPath}", 
                        "エラー", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }
                
                // デバッグ情報表示
                Debug.WriteLine($"現在のディレクトリ: {currentDirectory}");
                Debug.WriteLine($"ソリューションルート: {solutionRoot}");
                Debug.WriteLine($"フロントエンドパス: {frontendPath}");
                
                ProcessStartInfo startInfo = new ProcessStartInfo();
                
                if (isDebugMode)
                {
                    // 開発環境: npmコマンドを実行
                    startInfo.FileName = "cmd.exe";
                    startInfo.Arguments = $"/c cd /d \"{frontendPath}\" && echo フロントエンド起動中... && npm run start";
                    startInfo.UseShellExecute = false; // シェルを使わない
                    startInfo.CreateNoWindow = true;   // コンソールウィンドウを表示しない
                    startInfo.RedirectStandardOutput = true; // 出力をリダイレクト
                    
                    // Electronコマンドが失敗した場合のフォールバック
                    if (!File.Exists(Path.Combine(frontendPath, "node_modules", "electron", "dist", "electron.exe")))
                    {
                        startInfo.Arguments = $"/c cd /d \"{frontendPath}\" && echo モジュールインストール中... && npm install && echo フロントエンド起動中... && npm run start";
                    }
                }
                else
                {
                    // 本番環境: 実行ファイルを起動
                    string exePath = Path.Combine(frontendPath, "VrcSnapArchive.exe");
                    if (!File.Exists(exePath))
                    {
                        exePath = Path.Combine(frontendPath, "SnapArchiveKai.exe");
                    }
                    
                    // まだ見つからない場合はテスト用Electronファイルを使用
                    // EXEファイルが見つからない場合は通常のElectronアプリを起動
                    if (!File.Exists(exePath))
                    {
                        startInfo.FileName = "cmd.exe";
                        // test-electron.jsではなく、package.jsonで定義されたnpm startを使用
                        startInfo.Arguments = $"/c cd /d \"{frontendPath}\" && npm run start";
                        startInfo.UseShellExecute = false; // シェルを使わない
                        startInfo.CreateNoWindow = true;   // コンソールウィンドウを表示しない
                        startInfo.RedirectStandardOutput = true; // 出力をリダイレクト
                    }
                    else
                    {
                        startInfo.FileName = exePath;
                        startInfo.UseShellExecute = true; // EXEファイルの場合はシェルを使う
                    }
                }
                
                // プロセスを起動
                Process process;
                
                if (startInfo.RedirectStandardOutput)
                {
                    // 出力をリダイレクトしている場合は別の方法で起動
                    process = new Process { StartInfo = startInfo };
                    process.Start();
                }
                else
                {
                    // 通常の起動
                    process = Process.Start(startInfo);
                }
                
                // ステータス表示を更新
                UpdateStatusInfo("メインアプリケーション起動", "Electronアプリを起動しました");
                
                // 起動ボタンの状態を更新
                UpdateLaunchButtonState();
                
                // システムトレイに通知
                notifyIcon.ShowBalloonTip(3000, "VRC SnapArchive", "メインアプリケーションを起動しました", ToolTipIcon.Info);
                
                // ランチャーをシステムトレイに格納（非表示化）
                Hide();
                
                // デバッグモードの場合はプロセス終了を監視
                if (process != null)
                {
                    Task.Run(() => {
                        try {
                            process.WaitForExit();
                            BeginInvoke(new Action(() => {
                                UpdateStatusInfo("Electronアプリ", "アプリが終了しました");
                                // アプリ終了時にボタン状態も更新
                                UpdateLaunchButtonState();
                                 Show();
                                 // ウィンドウを最小化から元の状態に戻す
                                WindowState = FormWindowState.Normal;
                            }));
                        } catch (Exception ex) {
                            Debug.WriteLine($"プロセス監視エラー: {ex.Message}");
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"メインアプリケーションの起動に失敗しました。\n\n{ex.Message}", 
                    "エラー", MessageBoxButtons.OK, MessageBoxIcon.Error);
                
                // エラーログ記録
                Debug.WriteLine($"アプリ起動エラー: {ex}");
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
            // 独自の実装を削除し、メインフォームの処理を呼び出す
            _mainForm.LaunchMainApplication();
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
            Task.Run(() =>
            {
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
                            break;
                        }
                        catch (Exception)
                        {
                            // ファイル削除に失敗した場合は少し待つ
                            Thread.Sleep(1000);
                        }
                    }

                    // 1秒ごとに確認
                    Thread.Sleep(1000);
                }
            });
        }

        public void Dispose()
        {
            _notifyIcon.Dispose();
        }
    }
}