using System;
using System.Threading;
using System.Windows.Forms;
using System.Linq;

namespace VSA_launcher
{
    internal static class Program
    {
        // アプリケーション全体で共有するミューテックス
        private static Mutex? _mutex = null;

        /// <summary>
        ///  The main entry point for the application.
        /// </summary>
        [STAThread]
        static void Main()
        {
            const string appMutexName = "VrcSnapArchiveKai_Launcher";
            bool createdNew;

            // 重複起動チェック用ミューテックスの作成を試みる
            _mutex = new Mutex(true, appMutexName, out createdNew);
            
            // 既に起動済みの場合
            if (!createdNew)
            {
                MessageBox.Show(
                    "SnapArchive Launcher は既に起動しています。\n" +
                    "タスクトレイアイコンから操作してください。",
                    "起動エラー",
                    MessageBoxButtons.OK, 
                    MessageBoxIcon.Information);
                return; // アプリケーションを終了
            }
            
            // アプリケーションの初期化処理
            Application.SetHighDpiMode(HighDpiMode.SystemAware);
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            try
            {
                // アプリケーションの実行
                Application.Run(new VSA_launcher());
            }
            finally
            {
                // アプリケーション終了時にミューテックスを解放
                _mutex?.ReleaseMutex();
                _mutex?.Dispose();
            }
        }
    }
}