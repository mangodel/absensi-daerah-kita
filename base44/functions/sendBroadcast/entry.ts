import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['super_admin', 'admin', 'admin_desa', 'admin_kelompok'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { title, message, zoom_link, target_scope, target_desa, target_kelompok, recipient_ids, channel } = body;

    if (!title || !message) {
      return Response.json({ error: 'title dan message wajib diisi' }, { status: 400 });
    }

    // Ambil semua member
    const allMembers = await base44.asServiceRole.entities.Member.list();

    // Filter penerima
    let recipients = allMembers;

    if (target_scope === 'Desa' && target_desa) {
      recipients = allMembers.filter(m => m.desa === target_desa && m.status !== 'Tidak Aktif');
    } else if (target_scope === 'Kelompok' && target_kelompok) {
      recipients = allMembers.filter(m => m.kelompok === target_kelompok && m.status !== 'Tidak Aktif');
    } else if (target_scope === 'Custom' && recipient_ids) {
      const ids = JSON.parse(recipient_ids);
      recipients = allMembers.filter(m => ids.includes(m.id));
    } else {
      recipients = allMembers.filter(m => m.status !== 'Tidak Aktif');
    }

    // Kirim email via Resend API (hanya jika channel === 'Email')
    let emailsSent = 0;
    let emailsFailed = 0;

    if (channel === 'Email') {
      const emailRecipients = recipients.filter(m => m.email && m.email.includes('@'));

      const htmlBody = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #4f46e5; margin-bottom: 16px;">${title}</h2>
        <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; white-space: pre-wrap; line-height: 1.6;">${message}</div>
        ${zoom_link ? `<div style="margin-top: 20px; padding: 16px; background: #e0f2fe; border-left: 4px solid #0284c7; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; color: #0c4a6e; font-weight: bold;">🔗 Link Zoom:</p>
          <a href="${zoom_link}" style="color: #0284c7; text-decoration: none; font-weight: bold;">${zoom_link}</a>
        </div>` : ''}
        <p style="color: #888; font-size: 12px; margin-top: 24px;">Pesan ini dikirim oleh ${user.full_name || user.email} melalui Portal Jamaah.</p>
      </div>`;

      const apiKey = Deno.env.get("RESEND_API_KEY");
      const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

      // Batch kirim 50 email per request (batas aman Resend)
      const BATCH_SIZE = 50;
      for (let i = 0; i < emailRecipients.length; i += BATCH_SIZE) {
        const batch = emailRecipients.slice(i, i + BATCH_SIZE);
        const toEmails = batch.map(m => m.email);
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              from: fromEmail,
              to: toEmails,
              subject: title,
              html: htmlBody
            })
          });
          if (res.ok) {
            emailsSent += batch.length;
          } else {
            const errText = await res.text();
            console.error(`Resend batch error (from: ${fromEmail}):`, errText);
            emailsFailed += batch.length;
          }
        } catch (err) {
          console.error(`Resend batch failed:`, err.message);
          emailsFailed += batch.length;
        }
      }
    }

    // Simpan broadcast ke database
    const broadcast = await base44.asServiceRole.entities.Broadcast.create({
      title,
      message,
      zoom_link: zoom_link || '',
      target_scope: target_scope || 'Semua',
      target_desa: target_desa || '',
      target_kelompok: target_kelompok || '',
      recipient_ids: recipient_ids || '',
      channel: channel || 'Portal',
      sent_by: user.email,
      sent_by_name: user.full_name || user.email,
      sent_at: new Date().toISOString(),
      recipient_count: channel === 'Email' ? emailsSent : recipients.length,
      status: 'Sent'
    });

    return Response.json({
      success: true,
      broadcast_id: broadcast.id,
      recipients_targeted: recipients.length,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
      channel
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});