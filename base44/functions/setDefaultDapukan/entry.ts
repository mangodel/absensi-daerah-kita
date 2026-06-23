import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Bulk update members to set dapukan="Jamaah" if empty or invalid
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Only admins can run this
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Get all members
        const allMembers = await base44.entities.Member.list();
        
        // Find members with missing or non-Jamaah dapukan (handle legacy values: anggota, Anggota, Jamaah Biasa, jamaah biasa)
        const legacyValues = ['anggota', 'Anggota', 'Jamaah Biasa', 'jamaah biasa', 'JAMAH BIASA', 'Jamaah biasa'];
        const toUpdate = allMembers.filter(m => !m.dapukan || legacyValues.includes(m.dapukan));

        if (toUpdate.length === 0) {
            return Response.json({ message: 'No members to update', count: 0 });
        }

        // Update each member with 100ms delay
        let updated = 0;
        for (const member of toUpdate) {
            try {
                await base44.entities.Member.update(member.id, { dapukan: 'Jamaah' });
                updated++;
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`Failed to update member ${member.full_name}:`, error);
            }
        }

        return Response.json({ success: true, updated, total: toUpdate.length });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});