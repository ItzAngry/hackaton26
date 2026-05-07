import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get all users
    const { data: users, error: userError } = await supabaseClient
      .from('users')
      .select('id, gold, energy, base_health')

    if (userError) throw userError

    const results = []

    for (const user of users) {
      // 2. Calculate Defense Score (Sum of completed tasks today)
      const today = new Date().toISOString().split('T')[0]
      const { data: completedTasks, error: taskError } = await supabaseClient
        .from('tasks')
        .select('difficulty')
        .eq('user_id', user.id)
        .eq('completed', true)
        .eq('date', today)

      if (taskError) continue

      const diffMultipliers: Record<string, number> = { 'easy': 1, 'medium': 2, 'hard': 3 }
      const defenseScore = (completedTasks || []).reduce((sum, t) => sum + (diffMultipliers[t.difficulty] || 1), 0)

      // 3. Calculate Enemy Power
      // Simple scaling: base power 10 + 5 per user level
      const enemyPower = 10 + (user.level || 1) * 5

      // 4. Determine Outcome
      let survived = true
      let damageDealt = 0
      let wallDurabilityChange = 0

      if (defenseScore < enemyPower) {
        survived = false
        damageDealt = (enemyPower - defenseScore) * 10
        wallDurabilityChange = -damageDealt
      } else {
        damageDealt = 0
      }

      // 5. Update Tower and Log Result
      await supabaseClient.from('tower').upsert({ 
        user_id: user.id, 
        wall_durability: Math.max(0, 100 + wallDurabilityChange) 
      })

      await supabaseClient.from('attack_log').insert({
        user_id: user.id,
        date: today,
        enemies_sent: Math.ceil(enemyPower / 5),
        damage_dealt: damageDealt,
        survived: survived
      })

      results.push({ userId: user.id, survived })
    }

    return new Response(JSON.stringify({ success: true, processed: results.length }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
