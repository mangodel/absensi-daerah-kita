import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Bulk update members to set dapukan="Jamaah" if dapukan is empty or not a recognized pengurus role.
 * Catches: empty, "Anggota", "Jamaah Biasa", and any value not in the valid dapukan list.
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Valid dapukan values (everything else → "Jamaah")
        const VALID_DAPUKAN = [
            "Ki", "Wakil", "KU", "PKU", "Penerobos", "Aghnia",
            "Muballigh 4S", "Muballigh Daerah", "Muballigh Desa", "Muballigh Kelompok",
            "PJP", "PJK", "Kepala Keluarga",
        ];

        // Get all members (paginate)
        let allMembers = [];
        let skip = 0;
        let hasMore = true;
        while (hasMore) {
            const batch = await base44.entities.Member.list('-created_date', 500, skip);
            allMembers = allMembers.concat(batch);
            hasMore = batch.length === 500;
            skip += 500;
        }

        // Find members with invalid dapukan
        const toUpdate = allMembers.filter(m => {
            const d = (m.dapukan || '').trim();
            return !d || d === '' || !VALID_DAPUKAN.includes(d);
        });

        if (toUpdate.length === 0) {
            return Response.json({ message: 'No members to update', count: 0 });
        }

        // Use bulkUpdate for efficiency
        const updateData = toUpdate.map(m => ({ id: m.id, dapukan: 'Jamaah' }));
        
        let updated = 0;
        // bulkUpdate max 500 per call
        for (let i = 0; i < updateData.length; i += 500) {
            const chunk = updateData.slice(i, i + 500);
            const result = await base44.entities.Member.bulkUpdate(chunk);
            updated += chunk.length;
        }

        return Response.json({ 
            success: true, 
            updated, 
            total: toUpdate.length,
            invalidValuesFound: [...new Set(toUpdate.map(m => m.dapukan || '(empty)'))]
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});