/*
  # Add registered_at to delivery_recipients

  ## Summary
  受信者が初回登録（パスワード設定）を完了した日時を記録するカラムを追加します。

  ## Changes
  - `delivery_recipients` テーブルに `registered_at` (timestamptz, nullable) カラムを追加
    - NULL = 未登録（初回アクセス時にリダイレクト対象）
    - 値あり = 登録済み（そのままダウンロードページを表示）
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_recipients' AND column_name = 'registered_at'
  ) THEN
    ALTER TABLE delivery_recipients ADD COLUMN registered_at timestamptz;
  END IF;
END $$;
