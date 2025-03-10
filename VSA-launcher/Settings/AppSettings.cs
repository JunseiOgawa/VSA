using System;
using System.Collections.Generic;

namespace VSA_launcher
{
    // SettingsManagerで使われているクラスと完全に一致させる
    public class AppSettings
    {
        public string ScreenshotPath { get; set; } = string.Empty;
        public string OutputPath { get; set; } = string.Empty;
        public FolderStructureSettings FolderStructure { get; set; } = new FolderStructureSettings();
        public FileRenaming FileRenaming { get; set; } = new FileRenaming();
        public Metadata Metadata { get; set; } = new Metadata();
        public Compression Compression { get; set; } = new Compression();
        public Performance Performance { get; set; } = new Performance();
        public LauncherSettings LauncherSettings { get; set; } = new LauncherSettings();
    }

    public class FolderStructureSettings
    {
        public bool Enabled { get; set; } = true;
        public string Type { get; set; } = "month"; // month, week, day
    }

    public class FileRenaming
    {
        public bool Enabled { get; set; } = true;
        public string Format { get; set; } = "yyyy-MM-dd-HHmm-seq";
    }

    public class Metadata
    {
        public bool Enabled { get; set; } = true;
        public bool AddWorldName { get; set; } = true;
        public bool AddDateTime { get; set; } = true;
    }

    public class Compression
    {
        public bool AutoCompress { get; set; } = true;
        public string CompressionLevel { get; set; } = "medium"; // low, medium, high
        public string OriginalFileHandling { get; set; } = "keep"; // keep, delete, move
    }

    public class Performance
    {
        public int CpuThreshold { get; set; } = 80;
        public int MaxConcurrentProcessing { get; set; } = 10;
    }

    public class LauncherSettings
    {
        public bool WatchingEnabled { get; set; } = true;
        public bool StartWithWindows { get; set; } = false;
    }

    // 拡張機能として使われていた古いクラスはVSA_launcher.Settings名前空間に移動
    namespace Settings
    {
        // RenameFormatSettingsなどの実装はここに残す
        public class RenameFormatSettings
        {
            // 既存のプロパティ
            public bool Enabled { get; set; } = true;
            public FormatType Type { get; set; } = FormatType.None;
            public string DatePattern { get; set; } = "";
            public bool IncludeWorldName { get; set; } = false;
            public bool IncludeWorldId { get; set; } = false;
            
            // 連番の桁数（新規追加）
            public int SequenceDigits { get; set; } = 3;
            
            // 連番の開始番号（新規追加）
            public int SequenceStart { get; set; } = 1;
            
            // 連番管理用ディクショナリ（キー：日時文字列、値：現在の連番）（新規追加）
            private static Dictionary<string, int> _sequenceCounters = new Dictionary<string, int>();
            
            public enum FormatType
            {
                None,
                Date,
                WorldName
            }

            // 既存のメソッド
            public static string GetFormatFromPreset(string presetName)
            {
                switch (presetName)
                {
                    case "年_月_日_時分_連番": return "yyyy_MM_dd_HHmm_###";
                    case "年月日_時分_連番": return "yyyyMMdd_HHmm_###";
                    case "年-月-日-曜日-時分-連番": return "yyyy-MM-dd-ddd-HHmm-###";
                    case "日-月-年-時分-連番": return "dd-MM-yyyy-HHmm-###";
                    case "月-日-年-時分-連番": return "MM-dd-yyyy-HHmm-###";
                    case "年.月.日.時分.連番": return "yyyy.MM.dd.HHmm.###";
                    case "時分_年月日_連番": return "HHmm_yyyyMMdd_###";
                    default: return "";
                }
            }
            
            // 連番取得メソッド（新規追加）
            public string GetSequenceNumber(DateTime dateTime)
            {
                // 日時キーの作成（分単位まで）
                string timeKey = dateTime.ToString("yyyyMMdd_HHmm");
                
                // 連番カウンタの取得と更新
                int sequenceNumber;
                if (_sequenceCounters.ContainsKey(timeKey))
                {
                    sequenceNumber = _sequenceCounters[timeKey] + 1;
                }
                else
                {
                    sequenceNumber = SequenceStart;
                }
                
                // 連番カウンタを保存
                _sequenceCounters[timeKey] = sequenceNumber;
                
                // フォーマットして返す
                return sequenceNumber.ToString($"D{SequenceDigits}");
            }
            
            // 日付ベースのファイル名フォーマット処理（新規追加）
            public string FormatDateBasedFileName(DateTime fileDate)
            {
                // フォーマットされた日付部分
                string formattedDate = fileDate.ToString(DatePattern);
                
                // 曜日処理（日本語曜日に置き換え）
                if (formattedDate.Contains("ddd"))
                {
                    string[] jpWeekDays = { "日", "月", "火", "水", "木", "金", "土" };
                    string weekDay = jpWeekDays[(int)fileDate.DayOfWeek];
                    formattedDate = formattedDate.Replace("ddd", weekDay);
                }
                
                // 連番処理（###を連番に置き換え）
                if (formattedDate.Contains("###"))
                {
                    string sequenceNumber = GetSequenceNumber(fileDate);
                    formattedDate = formattedDate.Replace("###", sequenceNumber);
                }
                
                return formattedDate;
            }
            
            // ワールド名ベースのファイル名フォーマット処理（新規追加）
            public string FormatWorldBasedFileName(DateTime fileDate, Dictionary<string, string> metadata)
            {
                string worldName = metadata.ContainsKey("WorldName") ? metadata["WorldName"] : "Unknown";
                string worldId = metadata.ContainsKey("WorldID") ? metadata["WorldID"] : "";
                
                // 安全なファイル名に変換
                worldName = MakeSafeFileName(worldName);
                
                // 基本ファイル名（日付部分）
                string baseName = fileDate.ToString("yyyyMMdd_HHmm");
                
                // ワールド名のみ
                if (Type == FormatType.WorldName)
                {
                    return $"{baseName}_{worldName}";
                }
                // ワールド名とID
                else
                {
                    worldId = MakeSafeFileName(worldId);
                    return $"{baseName}_{worldName}_{worldId}";
                }
            }
            
            // 安全なファイル名を生成（特殊文字を置換）（新規追加）
            private string MakeSafeFileName(string name)
            {
                if (string.IsNullOrEmpty(name))
                {
                    return "Unknown";
                }
                
                // 無効な文字を削除または置換
                foreach (char c in System.IO.Path.GetInvalidFileNameChars())
                {
                    name = name.Replace(c, '_');
                }
                
                // その他の問題のある文字を置換
                name = name.Replace(' ', '_');
                name = name.Replace(':', '_');
                name = name.Replace(';', '_');
                name = name.Replace('\'', '_');
                name = name.Replace('"', '_');
                name = name.Replace('/', '_');
                name = name.Replace('\\', '_');
                
                // 長すぎる場合は切り詰め
                int maxLength = 50; // または設定から取得
                if (name.Length > maxLength)
                {
                    name = name.Substring(0, maxLength);
                }
                
                return name;
            }
            
            // ディクショナリをクリア（日付が変わった時など）（新規追加）
            public static void ResetSequenceCounters()
            {
                _sequenceCounters.Clear();
            }
        }
    }
}