import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const messageId: string | null = searchParams.get("id");

  if (!messageId) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; padding: 2rem; text-align: center; }
            h1 { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1>Missing Message ID</h1>
          <p>No email message ID was provided.</p>
        </body>
      </html>
      `,
      {
        status: 400,
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  const decodedMessageId: string = decodeURIComponent(messageId);

  const messageUrl = `message:${encodeURIComponent(decodedMessageId)}`;

  return new NextResponse(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Opening in Mail...</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            padding: 2rem;
            text-align: center;
            background: #f9fafb;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          .container {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            max-width: 400px;
          }
          h1 { color: #111827; font-size: 1.5rem; margin-bottom: 0.5rem; }
          p { color: #6b7280; margin-bottom: 1.5rem; }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e5e7eb;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          a {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 500;
          }
          a:hover { background: #2563eb; }
          .note {
            margin-top: 1.5rem;
            font-size: 0.875rem;
            color: #9ca3af;
          }
        </style>
        <script>
          window.location.href = "${messageUrl}";

          setTimeout(function() {
            document.getElementById('manual').style.display = 'block';
            document.getElementById('loading').style.display = 'none';
          }, 2000);
        </script>
      </head>
      <body>
        <div class="container">
          <div id="loading">
            <div class="spinner"></div>
            <h1>Opening in Mail...</h1>
            <p>Redirecting to your email app</p>
          </div>
          <div id="manual" style="display: none;">
            <h1>Open in Mail</h1>
            <p>If the email didn't open automatically, tap the button below.</p>
            <a href="${messageUrl}">Open in Mail App</a>
            <p class="note">
              Note: This only works if the email is synced in your Mail app
              (iOS/macOS) with the same Gmail account.
            </p>
          </div>
        </div>
      </body>
    </html>
    `,
    {
      status: 200,
      headers: { "Content-Type": "text/html" },
    }
  );
}
