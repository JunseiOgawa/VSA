namespace VSA_launcher
{
    /// <summary>
    /// ファイル名の生成を担当するクラス
    /// </summary>
    public class FileNameGenerator
    {
        private readonly AppSettings _settings;
        
        // 日付パターンごとの連番カウンターを保持する静的ディクショナリ
        // キー: 日付パターン（例: "20250410"）、値: 最後に使用した連番
        private static Dictionary<string, int> _sequenceCounters = new Dictionary<string, int>();

        public FileNameGenerator(AppSettings settings)
        {
            _settings = settings;
        }

        /// <summary>
        /// 設定されたフォーマットに基づいてファイル名を生成
        /// </summary>
        public string GenerateFileName(string sourceFilePath)
        {
            if (!_settings.FileRenaming.Enabled)
            {
                return Path.GetFileName(sourceFilePath);
            }

            // 作成日時を取得
            DateTime fileCreationTime = File.GetCreationTime(sourceFilePath);
            string format = _settings.FileRenaming.Format;
            
            // フォーマット処理を適用したファイル名を生成
            string newFileName = GenerateFormattedName(fileCreationTime, format);
            
            // 拡張子を保持
            string extension = Path.GetExtension(sourceFilePath);
            
            // 最終ファイル名を返す
            return newFileName + extension;
        }

        /// <summary>
        /// 日付フォーマットに基づくファイル名生成
        /// </summary>
        public string GenerateFormattedName(DateTime dateTime, string format)
        {
            // フォーマットに日付を適用
            string fileName = dateTime.ToString(format);

            // seq や 連番 を 3桁連番に置き換え
            if (format.Contains("seq") || format.Contains("連番"))
            {
                fileName = ReplaceSequenceNumber(fileName, format, dateTime);
            }

            // ddd を日本語曜日に置換
            if (format.Contains("ddd"))
            {
                string[] dayOfWeekJp = { "日", "月", "火", "水", "木", "金", "土" };
                fileName = fileName.Replace("ddd", dayOfWeekJp[(int)dateTime.DayOfWeek]);
            }

            return fileName;
        }

        /// <summary>
        /// ファイル名の連番部分を置換（改良版 - 順序通りの連番を生成）
        /// </summary>
        private string ReplaceSequenceNumber(string fileName, string format, DateTime dateTime)
        {
            // 連番を格納する日付キーを作成
            string dateKey = dateTime.ToString("yyyyMMdd");
            
            try
            {
                // 出力先フォルダ
                string outputFolder = _settings.OutputPath;
                if (string.IsNullOrEmpty(outputFolder) || !Directory.Exists(outputFolder))
                {
                    // 出力先が無効な場合はデフォルトの連番を使用
                    return ReplaceWithSequenceNumber(fileName, 1);
                }
                
                // フォルダ構造に応じたサブディレクトリを取得
                string subFolder = "";
                if (_settings.FolderStructure.Enabled)
                {
                    switch (_settings.FolderStructure.Type.ToLower())
                    {
                        case "month":
                            subFolder = dateTime.ToString("yyyy-MM");
                            dateKey = dateTime.ToString("yyyyMM"); // 月単位のグループキー
                            break;
                        case "week":
                            var cal = System.Globalization.CultureInfo.InvariantCulture.Calendar;
                            int weekNum = cal.GetWeekOfYear(
                                dateTime, 
                                System.Globalization.CalendarWeekRule.FirstFourDayWeek, 
                                DayOfWeek.Monday);
                            subFolder = $"{dateTime.Year}-W{weekNum:D2}";
                            dateKey = $"{dateTime.Year}W{weekNum:D2}"; // 週単位のグループキー
                            break;
                        case "day":
                            subFolder = dateTime.ToString("yyyy-MM-dd");
                            dateKey = dateTime.ToString("yyyyMMdd"); // 日単位のグループキー
                            break;
                        default:
                            subFolder = dateTime.ToString("yyyy-MM");
                            dateKey = dateTime.ToString("yyyyMM"); // デフォルトは月単位
                            break;
                    }
                    outputFolder = Path.Combine(outputFolder, subFolder);
                }
                
                // 既存の連番を取得
                int sequenceNumber;
                
                // 既存のカウンターがあればインクリメント、なければ既存ファイルから最大値を検索
                if (_sequenceCounters.TryGetValue(dateKey, out int currentValue))
                {
                    sequenceNumber = currentValue + 1;
                }
                else
                {
                    // 基本ファイル名パターン（連番部分を除いた部分）を作成
                    string basePattern = fileName.Replace("seq", "").Replace("連番", "");
                    
                    // 連番を取り除いたパターン
                    string searchPattern = basePattern + "*.*";
                    
                    // 出力フォルダ内での最大連番を検索
                    sequenceNumber = 1; // デフォルト値
                    
                    if (Directory.Exists(outputFolder))
                    {
                        var files = Directory.GetFiles(outputFolder, searchPattern);
                        
                        // 連番パターンに一致するファイルから最大の連番を抽出
                        var regex = new System.Text.RegularExpressions.Regex(
                            System.Text.RegularExpressions.Regex.Escape(basePattern) + "(\\d{3})");
                        
                        foreach (var file in files)
                        {
                            var match = regex.Match(Path.GetFileNameWithoutExtension(file));
                            if (match.Success && match.Groups.Count > 1)
                            {
                                if (int.TryParse(match.Groups[1].Value, out int num) && num >= sequenceNumber)
                                {
                                    sequenceNumber = num + 1;
                                }
                            }
                        }
                    }
                }
                
                // カウンターを更新
                _sequenceCounters[dateKey] = sequenceNumber;
                
                // 連番を置換
                return ReplaceWithSequenceNumber(fileName, sequenceNumber);
            }
            catch (Exception ex)
            {
                // エラー時はデフォルトの1を使用
                System.Diagnostics.Debug.WriteLine($"連番生成エラー: {ex.Message}");
                int defaultSequence = 1;
                
                // カウンターが既に存在していれば、それをインクリメント
                if (_sequenceCounters.TryGetValue(dateKey, out int currentValue))
                {
                    defaultSequence = currentValue + 1;
                }
                
                // カウンターを更新
                _sequenceCounters[dateKey] = defaultSequence;
                
                return ReplaceWithSequenceNumber(fileName, defaultSequence);
            }
        }
        
        /// <summary>
        /// ファイル名の連番プレースホルダを実際の連番に置換
        /// </summary>
        private string ReplaceWithSequenceNumber(string fileName, int sequenceNumber)
        {
            // 連番を3桁の数字で置換
            return fileName
                .Replace("seq", sequenceNumber.ToString("D3"))
                .Replace("連番", sequenceNumber.ToString("D3"));
        }

        /// <summary>
        /// プレビュー用のファイル名を生成
        /// </summary>
        public string GeneratePreviewFileName(string format)
        {
            // 現在の日時を使用
            DateTime now = DateTime.Now;
            
            // 連番を固定値に置き換えたフォーマットに変更
            string modifiedFormat = format
                .Replace("seq", "001")
                .Replace("連番", "001");
                
            // 日付フォーマットを適用
            string fileName = now.ToString(modifiedFormat);
            
            // ddd を日本語曜日に置換
            if (format.Contains("ddd"))
            {
                string[] dayOfWeekJp = { "日", "月", "火", "水", "木", "金", "土" };
                fileName = fileName.Replace("ddd", dayOfWeekJp[(int)now.DayOfWeek]);
            }
            
            // プレビュー用に拡張子を追加
            return $"{fileName}.png";
        }
        
        /// <summary>
        /// 連番カウンターをリセット
        /// </summary>
        public static void ResetSequenceCounters()
        {
            _sequenceCounters.Clear();
        }
    }
}