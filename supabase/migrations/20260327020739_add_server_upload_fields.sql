/*
  # ファイルサーバー連携フィールドの追加

  ## 概要
  サーバー設定とファイル配信にファイルサーバー連携のための追加フィールドを付与します。

  ## 変更内容

  ### server_configs テーブル
  - `upload_path` (text) - サーバー上のアップロード先ディレクトリパス（例: /data/secureshare）
  - `password_enc` (text) - 接続パスワード（暗号化なし、アプリ側で扱い注意）
  - `is_active` (boolean) - このサーバーをデフォルトのアップロード先として使用するか

  ### delivery_files テーブル
  - `server_config_id` (uuid) - 転送先サーバー設定への参照（NULLはSupabase Storageのみ）
  - `server_path` (text) - サーバー上の実際のファイルパス（転送成功後に記録）
  - `server_upload_status` (text) - none | uploading | success | failed
  - `server_upload_error` (text) - 転送失敗時のエラーメッセージ

  ## セキュリティ
  - 既存のRLSポリシーを継承（変更なし）
  - server_config_id は外部キー参照なし（配信後にサーバー削除されても記録維持）
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'server_configs' AND column_name = 'upload_path'
  ) THEN
    ALTER TABLE server_configs ADD COLUMN upload_path text NOT NULL DEFAULT '/secureshare';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'server_configs' AND column_name = 'password_enc'
  ) THEN
    ALTER TABLE server_configs ADD COLUMN password_enc text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'server_configs' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE server_configs ADD COLUMN is_active boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_files' AND column_name = 'server_config_id'
  ) THEN
    ALTER TABLE delivery_files ADD COLUMN server_config_id uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_files' AND column_name = 'server_path'
  ) THEN
    ALTER TABLE delivery_files ADD COLUMN server_path text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_files' AND column_name = 'server_upload_status'
  ) THEN
    ALTER TABLE delivery_files ADD COLUMN server_upload_status text NOT NULL DEFAULT 'none';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_files' AND column_name = 'server_upload_error'
  ) THEN
    ALTER TABLE delivery_files ADD COLUMN server_upload_error text;
  END IF;
END $$;
