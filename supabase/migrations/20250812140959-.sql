-- Set insert_notification to SECURITY INVOKER explicitly
ALTER FUNCTION public.insert_notification(
  _user_id uuid,
  _type notification_type,
  _title text,
  _message text
) SECURITY INVOKER;

-- Attach rate limit trigger to chat_messages using existing function
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'chat_messages_rate_limit_trigger'
  ) THEN
    EXECUTE $SQL$
      CREATE TRIGGER chat_messages_rate_limit_trigger
      BEFORE INSERT ON public.chat_messages
      FOR EACH ROW
      EXECUTE FUNCTION public.enforce_chat_message_rate_limit();
    $SQL$;
  END IF;
END $$;