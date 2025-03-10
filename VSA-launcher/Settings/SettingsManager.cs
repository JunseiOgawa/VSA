using System;
using System.IO;
using Newtonsoft.Json;

namespace VSA_launcher
{
    public static class SettingsManager
    {
        private static readonly string SettingsFileName = "appsettings.json";
        private static readonly string SettingsFilePath = Path.Combine(
            AppDomain.CurrentDomain.BaseDirectory, SettingsFileName);

        public static AppSettings LoadSettings()
        {
            try
            {
                if (File.Exists(SettingsFilePath))
                {
                    string json = File.ReadAllText(SettingsFilePath);
                    return JsonConvert.DeserializeObject<AppSettings>(json) ?? new AppSettings();
                }
            }
            catch (Exception ex)
            {
                // 読み込みエラー時はログに記録
                Console.WriteLine($"設定ファイルの読み込みエラー: {ex.Message}");
            }

            return new AppSettings();
        }

        public static void SaveSettings(AppSettings settings)
        {
            try
            {
                string json = JsonConvert.SerializeObject(settings, Formatting.Indented);
                File.WriteAllText(SettingsFilePath, json);
            }
            catch (Exception ex)
            {
                // 保存エラー時はログに記録
                Console.WriteLine($"設定ファイルの保存エラー: {ex.Message}");
            }
        }
    }
}