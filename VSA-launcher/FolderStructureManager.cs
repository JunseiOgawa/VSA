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
            bool isSourceMonthStructure = IsMonthFolderStructure(Path.GetDirectoryName(sourceFilePath) ?? "");
            
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
            // 親フォルダから月フォルダ名を取得（YYYY-MM形式を想定）
            string sourceFolder = Path.GetDirectoryName(sourceFilePath) ?? "";
            string monthFolderName = Path.GetFileName(sourceFolder);
            
            // YYYY-MM形式かどうか確認
            if (Regex.IsMatch(monthFolderName, @"^\d{4}-\d{2}$"))
            {
                return Path.Combine(_settings.OutputPath, monthFolderName);
            }
            else
            {
                // 形式が違う場合は現在の月を使用
                return Path.Combine(_settings.OutputPath, DateTime.Now.ToString("yyyy-MM"));
            }
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
        /// フォルダ構造が月別かどうかを判定
        /// </summary>
        public bool IsMonthFolderStructure(string folderPath)
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
    }
}