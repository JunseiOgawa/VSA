using System;
using System.IO;
using Microsoft.Win32;

namespace VSA_launcher
{
    /// <summary>
    /// Windowsのスタートアップ登録を管理するクラス
    /// </summary>
    public static class StartupManager
    {
        // レジストリキー
        private const string RUN_LOCATION = @"Software\Microsoft\Windows\CurrentVersion\Run";
        
        // アプリケーション名（レジストリのキー名として使用）
        private const string APP_NAME = "VrcSnapArchiveKai";
        
        /// <summary>
        /// アプリケーションをスタートアップに登録する
        /// </summary>
        /// <returns>登録が成功したかどうか</returns>
        public static bool RegisterInStartup()
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(RUN_LOCATION, true))
                {
                    if (key == null)
                    {
                        System.Diagnostics.Debug.WriteLine("レジストリキーが見つかりません: " + RUN_LOCATION);
                        return false;
                    }
                    
                    // 実行可能ファイルの完全パスを取得
                    string executablePath = System.Reflection.Assembly.GetExecutingAssembly().Location;
                    
                    // .dllが返される場合は.exeに変更
                    if (executablePath.EndsWith(".dll"))
                    {
                        executablePath = executablePath.Replace(".dll", ".exe");
                    }
                    
                    // パスが存在するか確認
                    if (!File.Exists(executablePath))
                    {
                        executablePath = System.Windows.Forms.Application.ExecutablePath;
                    }
                    
                    // レジストリに登録
                    key.SetValue(APP_NAME, executablePath);
                    
                    System.Diagnostics.Debug.WriteLine($"スタートアップに登録しました: {executablePath}");
                    return true;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"スタートアップ登録エラー: {ex.Message}");
                return false;
            }
        }
        
        /// <summary>
        /// アプリケーションをスタートアップから解除する
        /// </summary>
        /// <returns>解除が成功したかどうか</returns>
        public static bool RemoveFromStartup()
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(RUN_LOCATION, true))
                {
                    if (key == null)
                    {
                        return false;
                    }
                    
                    // レジストリから削除
                    if (key.GetValue(APP_NAME) != null)
                    {
                        key.DeleteValue(APP_NAME);
                    }
                    
                    System.Diagnostics.Debug.WriteLine("スタートアップから解除しました");
                    return true;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"スタートアップ解除エラー: {ex.Message}");
                return false;
            }
        }
        
        /// <summary>
        /// 現在スタートアップに登録されているか確認する
        /// </summary>
        /// <returns>登録されていればtrue</returns>
        public static bool IsRegisteredInStartup()
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(RUN_LOCATION, false))
                {
                    if (key == null)
                    {
                        return false;
                    }
                    
                    // レジストリ値を取得
                    object value = key.GetValue(APP_NAME);
                    return (value != null);
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"スタートアップ確認エラー: {ex.Message}");
                return false;
            }
        }
    }
}
