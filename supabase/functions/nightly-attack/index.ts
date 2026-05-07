import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // 1. Get all users
    const { data: users, error: userError } = await supabase.from('profiles').select('id, wall_durability')
    if (userError) throw userError

    for (const user of users) {
      // 2. Calculate defense score based on completed tasks for today
      const today = new Date().toISOString().split('T')[0]
      const { data: tasks, error: taskError } = await supabase
        .from('tasks')
        .select('difficulty')
        .eq('user_id', user.id)
        .eq('date', today)
        .eq('completed', true)

      if (taskError) console.error(`Error fetching tasks for ${user.id}:`, taskError)

      const multipliers = { Easy: 1, Medium: 2, Hard: 3 }
      const defenseScore = (tasks || []).reduce((acc, t) => acc + (multipliers[t.difficulty as keyof typeof multipliers] || 1), 0)

      // 3. Enemy Power
      const basePower = 5
      const enemyPower = basePower * (1 + 0.15) // Simplified logic for MVP

      // 4. Resolve Attack
      let survived = true
      let damageDealt = 0
      let newDurability = user.wall_durability

      if (defenseScore < enemyPower) {
        damageDealt = (enemyPower - defenseScore) * 10
        newDurability -= damageDealt
        if (newDurability <= 0) {
          newDurability = 0
          survived = false
        }
      }

      // 5. Update Tower and Log Attack
      await supabase.from('tower').update({ wall_durability: newDurability }).eq('user_id', user.id)
      await supabase.from('attack_log').insert({
        user_id: user.id,
        date: today,
        enemies_sent: Math.floor(enemyPower),
        damage_dealt: damageDealt,
        survived: survived
      })
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
