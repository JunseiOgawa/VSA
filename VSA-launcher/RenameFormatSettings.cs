using System;
using System.Collections.Generic;

namespace VSA_launcher
{
    /// <summary>
    /// ファイル名リネーム処理のための設定クラス
    /// </summary>
    public class RenameFormatSettings
    {
        // リネーム有効/無効
        public bool Enabled { get; set; } = true;
        
        // 日付フォーマットパターン - 定型のフォーマット文字列
        public string DatePattern { get; set; } = "yyyyMMdd_HHmm";
        
        // フォーマットタイプ（日付ベース/ワールド名ベース）
        public FormatType Type { get; set; } = FormatType.Date;
        
        // 連番の桁数
        public int SequenceDigits { get; set; } = 3;
        
        // 連番の開始番号
        public int SequenceStart { get; set; } = 1;
        
        // ワールド名追加オプション
        public bool IncludeWorldName { get; set; } = false;
        
        // ワールドID追加オプション
        public bool IncludeWorldId { get; set; } = false;
        
        // フレンドリスト追加オプション
        public bool IncludeFriends { get; set; } = false;
        
        // 最大文字数制限（ワールド名など）
        public int MaxNameLength { get; set; } = 50;
        
        // リネーム形式タイプ
        public enum FormatType
        {
            None = 0,
            Date = 1,
            WorldName = 2,
            WorldNameAndId = 3,
            DateAndWorldName = 4,
            Custom = 5
        }
        
        // フォーマットプリセット
        public static Dictionary<string, string> DateFormatPresets = new Dictionary<string, string>
        {
            { "年_月_日_時分_連番", "yyyy_MM_dd_HHmm" },
            { "年月日_時分_連番", "yyyyMMdd_HHmm" },
            { "年-月-日-曜日-時分-連番", "yyyy-MM-dd-ddd-HHmm" },
            { "日-月-年-時分-連番", "dd-MM-yyyy-HHmm" },
            { "月-日-年-時分-連番", "MM-dd-yyyy-HHmm" },
            { "年.月.日.時分.連番", "yyyy.MM.dd.HHmm" },
            { "時分_年月日_連番", "HHmm_yyyyMMdd" }
        };
        
        // プリセット名からフォーマット取得
        public static string GetFormatFromPreset(string presetName)
        {
            return DateFormatPresets.TryGetValue(presetName, out string format) ? format : "yyyyMMdd_HHmm";
        }

        // 改善後
        public static string ReplaceInvalidChars(string name)
        {
            char[] charsToReplace = { ' ', ':', ';', '\'', '"', '/', '\\' };
            foreach (char c in charsToReplace)
            {
                name = name.Replace(c, '_');
            }
            return name;
        }
    }
}