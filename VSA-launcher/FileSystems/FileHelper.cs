using System;
using System.IO;
using System.Threading; // Thread.Sleepを使用するために追加

namespace VSA_launcher
{
    /// <summary>
    /// ファイル操作のためのヘルパークラス
    /// </summary>
    public static class FileHelper
    {
        /// <summary>
        /// ファイルを安全に読み取りモードで開く
        /// </summary>
        public static FileStream OpenFileForReading(string filePath)
        {
            try
            {
                return new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
            }
            catch (Exception ex)
            {
                throw new IOException($"ファイル読み込みエラー: {ex.Message}", ex);
            }
        }
        
        /// <summary>
        /// ファイルを安全に書き込みモードで開く
        /// </summary>
        public static FileStream OpenFileForWriting(string filePath, bool overwrite = false)
        {
            try
            {
                if (File.Exists(filePath) && !overwrite)
                {
                    throw new IOException($"ファイルが既に存在します: {filePath}");
                }
                
                // 必要に応じて親ディレクトリを作成
                string? dir = Path.GetDirectoryName(filePath);
                if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                {
                    Directory.CreateDirectory(dir);
                }
                
                return new FileStream(filePath, FileMode.Create, FileAccess.Write);
            }
            catch (Exception ex)
            {
                throw new IOException($"ファイル書き込みエラー: {ex.Message}", ex);
            }
        }
        
        /// <summary>
        /// ファイルをコピーする（リトライ機能付き）
        /// </summary>
        public static bool CopyFileWithRetry(string source, string destination, int maxRetries = 5, int retryDelayMs = 500)
        {
            int retryCount = 0;
            while (retryCount < maxRetries)
            {
                try
                {
                    using (var sourceStream = OpenFileForReading(source))
                    using (var destStream = OpenFileForWriting(destination, true))
                    {
                        sourceStream.CopyTo(destStream);
                    }
                    return true;
                }
                catch (IOException)
                {
                    retryCount++;
                    if (retryCount >= maxRetries)
                        return false;
                        
                    Thread.Sleep(retryDelayMs);
                }
            }
            return false;
        }
    }
}
