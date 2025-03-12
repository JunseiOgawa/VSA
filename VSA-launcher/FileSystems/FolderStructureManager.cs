using System.Text.RegularExpressions;

namespace VSA_launcher
{
    /// <summary>
    /// 出力フォルダの構造を管理するクラス
    /// </summary>
    public class FolderStructureManager
    {
        private readonly AppSettings _settings;

        public FolderStructureManager(AppSettings settings)
        {
            _settings = settings;
        }

        /// <summary>
        /// ソースファイルに基づいて適切な出力先フォルダを決定
        /// </summary>
        public string GetDestinationFolder(string sourceFilePath)
        {
            string destinationFolder = _settings.OutputPath;
            
            // フォルダ分けが無効なら出力先をそのまま返す
            if (!_settings.FolderStructure.Enabled)
            {
                return destinationFolder;
            }
            
            // ソースパスがVRCの月別フォルダ構造かどうか判定
            string? sourceDir = Path.GetDirectoryName(sourceFilePath);
            bool isSourceMonthStructure = sourceDir != null && (
                IsMonthFolder(sourceDir) ||  // 直接月フォルダ内
                IsMonthFolderParent(sourceDir) // 月フォルダの親
            );
            
            if (isSourceMonthStructure)
            {
                return GetMonthBasedDestinationFolder(sourceFilePath);
            }
            else
            {
                return GetConfigurationBasedDestinationFolder(sourceFilePath);
            }
        }

        /// <summary>
        /// 月別フォルダ構造に基づく出力先を取得
        /// </summary>
        private string GetMonthBasedDestinationFolder(string sourceFilePath)
        {
            // 親フォルダのパスを取得
            string? sourceFolder = Path.GetDirectoryName(sourceFilePath);
            if (sourceFolder == null)
            {
                // 親フォルダが取得できない場合は設定に基づいて処理
                return GetConfigurationBasedDestinationFolder(sourceFilePath);
            }
            
            // このフォルダが直接月フォルダかチェック
            if (IsMonthFolder(sourceFolder))
            {
                // 月フォルダ名を取得
                string monthFolderName = Path.GetFileName(sourceFolder);
                return Path.Combine(_settings.OutputPath, monthFolderName);
            }
            
            // 親の親フォルダを調査（例: VRChat\2025-04の場合、2025-04を取得）
            string[] subDirs = Directory.GetDirectories(sourceFolder);
            foreach (string subDir in subDirs)
            {
                if (IsMonthFolder(subDir))
                {
                    // ファイルが属する月フォルダを特定
                    string filePath = Path.GetFullPath(sourceFilePath);
                    if (filePath.StartsWith(Path.GetFullPath(subDir)))
                    {
                        // ファイルが特定の月フォルダ内にある
                        string monthFolderName = Path.GetFileName(subDir);
                        return Path.Combine(_settings.OutputPath, monthFolderName);
                    }
                }
            }
            
            // 特定の月フォルダに属していないか、月フォルダが見つからない場合は現在の月を使用
            return Path.Combine(_settings.OutputPath, DateTime.Now.ToString("yyyy-MM"));
        }

        /// <summary>
        /// 設定に基づく出力先フォルダを取得
        /// </summary>
        private string GetConfigurationBasedDestinationFolder(string sourceFilePath)
        {
            // ファイルの作成日時を使用
            DateTime fileTime = File.GetCreationTime(sourceFilePath);
            string subFolder;

            // 分類タイプに応じてフォルダ名を決定
            switch (_settings.FolderStructure.Type)
            {
                case "month":
                    subFolder = fileTime.ToString("yyyy-MM");
                    break;
                case "week":
                    // 週番号を取得（文化に依存）
                    int weekNum = System.Globalization.CultureInfo.CurrentCulture.Calendar.GetWeekOfYear(
                        fileTime, System.Globalization.CalendarWeekRule.FirstDay, DayOfWeek.Monday);
                    subFolder = $"{fileTime.Year}-W{weekNum:D2}";
                    break;
                case "day":
                    subFolder = fileTime.ToString("yyyy-MM-dd");
                    break;
                default:
                    subFolder = fileTime.ToString("yyyy-MM");
                    break;
            }

            // サブフォルダのフルパス
            return Path.Combine(_settings.OutputPath, subFolder);
        }

        /// <summary>
        /// 指定されたパスが月別フォルダ（YYYY-MM形式）かどうかを判定
        /// </summary>
        public bool IsMonthFolder(string folderPath)
        {
            if (!Directory.Exists(folderPath))
            {
                return false;
            }
            
            string folderName = Path.GetFileName(folderPath);
            return Regex.IsMatch(folderName, @"^\d{4}-\d{2}$");
        }
        
        /// <summary>
        /// 指定されたフォルダが月別フォルダの親ディレクトリかどうかを判定
        /// </summary>
        public bool IsMonthFolderParent(string folderPath)
        {
            try
            {
                if (!Directory.Exists(folderPath))
                {
                    return false;
                }
                
                // サブフォルダが月フォルダ形式のものがあるか検査
                string[] subDirs = Directory.GetDirectories(folderPath);
                int monthFolderCount = subDirs
                    .Select(Path.GetFileName)
                    .Count(dir => Regex.IsMatch(dir ?? "", @"^\d{4}-\d{2}$"));
                
                return monthFolderCount > 0;
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// フォルダ構造が月別かどうかを判定
        /// </summary>
        public bool IsMonthFolderStructure(string folderPath)
        {
            try
            {
                // 指定されたパスが存在するか確認
                if (!Directory.Exists(folderPath))
                {
                    return false;
                }
                
                // 指定されたフォルダ自体が月フォルダ形式
                if (IsMonthFolder(folderPath))
                {
                    return true;
                }
                
                // 指定されたフォルダが月フォルダの親
                return IsMonthFolderParent(folderPath);
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// 指定されたルートフォルダ内の最新の月フォルダを取得
        /// </summary>
        public string? GetLatestMonthFolder(string rootFolder)
        {
            try
            {
                if (!Directory.Exists(rootFolder))
                {
                    return null;
                }
                
                // 直接、月フォルダである場合
                if (IsMonthFolder(rootFolder))
                {
                    return rootFolder;
                }
                
                // サブフォルダから月フォルダを検索
                string[] monthFolders = Directory.GetDirectories(rootFolder)
                    .Where(dir => Regex.IsMatch(Path.GetFileName(dir), @"^\d{4}-\d{2}$"))
                    .ToArray();
                
                if (monthFolders.Length == 0)
                {
                    return null;
                }
                
                // 最新の月フォルダを探す
                DateTime latestDate = DateTime.MinValue;
                string? latestFolder = null;
                
                foreach (string folder in monthFolders)
                {
                    string folderName = Path.GetFileName(folder);
                    if (DateTime.TryParseExact(folderName, "yyyy-MM", 
                        System.Globalization.CultureInfo.InvariantCulture,
                        System.Globalization.DateTimeStyles.None, 
                        out DateTime folderDate))
                    {
                        if (folderDate > latestDate)
                        {
                            latestDate = folderDate;
                            latestFolder = folder;
                        }
                    }
                }
                
                return latestFolder;
            }
            catch
            {
                return null;
            }
        }
    }
}