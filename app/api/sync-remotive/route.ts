import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin client – bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await fetch('https://remotive.com/api/remote-jobs', {
      headers: { 'User-Agent': 'OfSkillJob/1.0' },
    });
    if (!response.ok) throw new Error(`Remotive API returned ${response.status}`);
    const data = await response.json();
    const jobs = data.jobs.slice(0, 20);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const job of jobs) {
      const externalUrl = job.url;
      const jobTitle = job.title;
      const companyName = job.company_name;
      const jobDescription = job.description;
      const jobLocation = job.candidate_required_location || 'Remote';
      const jobCategory = job.category || 'Remote';

      if (!jobTitle || !externalUrl) {
        skipped++;
        continue;
      }

      // Check if already exists
      const { data: existing, error: findError } = await supabaseAdmin
        .from('jobs')
        .select('id')
        .eq('external_apply_url', externalUrl)
        .maybeSingle();

      if (findError) {
        console.error('Find error:', findError);
        skipped++;
        continue;
      }

      const ourJob = {
        title: jobTitle.slice(0, 255),
        company_name: companyName?.slice(0, 255) || 'Remote Company',
        description: jobDescription?.slice(0, 5000) || '',
        location: jobLocation,
        is_remote: true,
        external_apply_url: externalUrl,
        role_type: jobCategory,
        salary_min: null,
        salary_max: null,
        task_required: false,
        task_title: null,
        task_instructions: null,
        task_type: null,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        source: 'remotive',
        company_id: null,
        created_at: new Date().toISOString(),
      };

      if (existing) {
        const { error: updateError } = await supabaseAdmin
          .from('jobs')
          .update({ description: ourJob.description })
          .eq('id', existing.id);
        if (updateError) {
          console.error('Update error:', updateError);
          skipped++;
        } else {
          updated++;
        }
      } else {
        const { error: insertError } = await supabaseAdmin.from('jobs').insert(ourJob);
        if (insertError) {
          console.error('Insert error:', insertError);
          skipped++;
        } else {
          inserted++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      updated,
      skipped,
      totalProcessed: jobs.length,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}