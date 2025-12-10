import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SharkData {
  name: string;
  is_guest_shark: boolean;
}

const ALL_SHARKS: SharkData[] = [
  // Main Sharks
  { name: 'Kevin Harrington', is_guest_shark: false },
  { name: 'Daymond John', is_guest_shark: false },
  { name: 'Barbara Corcoran', is_guest_shark: false },
  { name: 'Robert Herjavec', is_guest_shark: false },
  { name: "Kevin O'Leary", is_guest_shark: false },
  { name: 'Mark Cuban', is_guest_shark: false },
  { name: 'Lori Greiner', is_guest_shark: false },
  { name: 'Daniel Lubetzky', is_guest_shark: false },
  
  // Guest Sharks
  { name: 'Jeff Foxworthy', is_guest_shark: true },
  { name: 'John Paul DeJoria', is_guest_shark: true },
  { name: 'Steve Tisch', is_guest_shark: true },
  { name: 'Nick Woodman', is_guest_shark: true },
  { name: 'Troy Carter', is_guest_shark: true },
  { name: 'Ashton Kutcher', is_guest_shark: true },
  { name: 'Chris Sacca', is_guest_shark: true },
  { name: 'Sara Blakely', is_guest_shark: true },
  { name: 'Richard Branson', is_guest_shark: true },
  { name: 'Bethenny Frankel', is_guest_shark: true },
  { name: 'Rohan Oza', is_guest_shark: true },
  { name: 'Alex Rodriguez', is_guest_shark: true },
  { name: 'Charles Barkley', is_guest_shark: true },
  { name: 'Matt Higgins', is_guest_shark: true },
  { name: 'Jamie Siminoff', is_guest_shark: true },
  { name: 'Alli Webb', is_guest_shark: true },
  { name: 'Katrina Lake', is_guest_shark: true },
  { name: 'Maria Sharapova', is_guest_shark: true },
  { name: 'Anne Wojcicki', is_guest_shark: true },
  { name: 'Blake Mycoskie', is_guest_shark: true },
  { name: 'Kendra Scott', is_guest_shark: true },
  { name: 'Emma Grede', is_guest_shark: true },
  { name: 'Kevin Hart', is_guest_shark: true },
  { name: 'Peter Jones', is_guest_shark: true },
  { name: 'Nirav Tolia', is_guest_shark: true },
  { name: 'Gwyneth Paltrow', is_guest_shark: true },
  { name: 'Tony Xu', is_guest_shark: true },
  { name: 'Candace Nelson', is_guest_shark: true },
  { name: 'Michael Rubin', is_guest_shark: true },
  { name: 'Jason Blum', is_guest_shark: true },
  { name: 'Rashaun L. Williams', is_guest_shark: true },
  { name: 'Todd Graves', is_guest_shark: true },
  { name: 'Jamie Kern Lima', is_guest_shark: true },
  { name: 'Michael Strahan', is_guest_shark: true },
  { name: 'Allison Ellsworth', is_guest_shark: true },
  { name: 'Chip Gaines', is_guest_shark: true },
  { name: 'Joanna Gaines', is_guest_shark: true },
  { name: 'Alexis Ohanian', is_guest_shark: true },
  { name: 'Fawn Weaver', is_guest_shark: true },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function seedSharks() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🦈 Seeding All Sharks');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { data: existing } = await supabase.from('sharks').select('slug');
  const existingSlugs = new Set((existing || []).map(s => s.slug));

  let created = 0;
  let skipped = 0;

  for (const shark of ALL_SHARKS) {
    const slug = slugify(shark.name);
    
    if (existingSlugs.has(slug)) {
      console.log(`   ⏭️  ${shark.name} (exists)`);
      skipped++;
      continue;
    }

    const { error } = await supabase.from('sharks').insert({
      name: shark.name,
      slug,
      is_guest_shark: shark.is_guest_shark,
    });

    if (error) {
      console.log(`   ❌ ${shark.name}: ${error.message}`);
    } else {
      console.log(`   ✅ ${shark.name}`);
      created++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Created: ${created}, Skipped: ${skipped}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

seedSharks().catch(console.error);
