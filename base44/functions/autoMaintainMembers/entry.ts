import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Auto-maintenance function to:
 * 1. Update members with "anggota"/"Jamaah Biasa" to "Jamaah"
 * 2. Assign missing member IDs based on priority
 * Called periodically or on demand
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Get all members
        const allMembers = await base44.entities.Member.list();
        
        if (!allMembers || allMembers.length === 0) {
            return Response.json({ success: true, dapukan_updated: 0, ids_assigned: 0 });
        }

        let dapukan_updated = 0;
        let ids_assigned = 0;

        // 1. Fix dapukan values
        for (const member of allMembers) {
            if (member.dapukan === 'anggota' || member.dapukan === 'Anggota' || !member.dapukan) {
                try {
                    await base44.entities.Member.update(member.id, { dapukan: 'Jamaah' });
                    dapukan_updated++;
                    await new Promise(resolve => setTimeout(resolve, 50));
                } catch (error) {
                    console.error(`Failed to update dapukan for ${member.full_name}:`, error);
                }
            }
        }

        // 2. Assign missing member IDs with priority
        const noId = allMembers.filter(m => !m.member_id);
        if (noId.length > 0) {
            const PRIORITY_DAPUKAN = ["Ki", "Wakil", "KU", "PKU", "Penerobos", "Aghnia", "Muballigh 4S", "Muballigh Daerah", "Muballigh Desa", "Muballigh Kelompok", "PJP", "PJK", "Kepala Keluarga"];
            const PRIORITY_LEVEL = ["Daerah", "Desa", "Kelompok"];

            function memberPriority(m) {
                const dapukanRank = PRIORITY_DAPUKAN.indexOf(m.dapukan || '');
                const levelRank = PRIORITY_LEVEL.indexOf(m.dapukan_level ?? "Kelompok");
                const dRank = dapukanRank === -1 ? 999 : dapukanRank;
                const lRank = levelRank === -1 ? 2 : levelRank;
                return lRank * 1000 + dRank;
            }

            const sorted = [...noId].sort((a, b) => memberPriority(a) - memberPriority(b));

            let maxNum = allMembers.reduce((max, m) => {
                if (!m.member_id) return max;
                const num = parseInt(m.member_id.replace("AUNZ", ""), 10);
                return !isNaN(num) && num > max ? num : max;
            }, 0);

            for (const m of sorted) {
                maxNum++;
                try {
                    await base44.entities.Member.update(m.id, { member_id: `AUNZ${String(maxNum).padStart(6, "0")}` });
                    ids_assigned++;
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    console.error(`Failed to assign ID to ${m.full_name}:`, error);
                }
            }
        }

        return Response.json({ 
            success: true, 
            dapukan_updated, 
            ids_assigned,
            message: `Updated ${dapukan_updated} dapukan values, assigned ${ids_assigned} member IDs`
        });
    } catch (error) {
        console.error('Auto-maintain error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});