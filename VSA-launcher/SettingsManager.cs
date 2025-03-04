using System;
using System.IO;
using Newtonsoft.Json;

namespace VSA_launcher
{
    public class AppSettings
    {
        public string ScreenshotPath { get; set; } = string.Empty;
        public string OutputPath { get; set; } = string.Empty;
        public FolderStructure FolderStructure { get; set; } = new FolderStructure();
        public FileRenaming FileRenaming { get; set; } = new FileRenaming();
        public Metadata Metadata { get; set; } = new Metadata();
        public Compression Compression { get; set; } = new Compression();
        public Performance Performance { get; set; } = new Performance();
        public LauncherSettings LauncherSettings { get; set; } = new LauncherSettings();
    }

    public class FolderStructure
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