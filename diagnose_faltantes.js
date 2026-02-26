
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
    const match = envContent.match(new RegExp(`${name}=(.*)`));
    return match ? match[1].trim() : null;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnose() {
    console.log("Checking 'pedidos' table...");

    const { data: pedidos, error: pedidosError } = await supabase
        .from('pedidos')
        .select('id, estado, fecha_creacion, fecha_recepcion');

    if (pedidosError) {
        console.error("Error fetching pedidos:", pedidosError);
    } else {
        console.log(`Total rows in 'pedidos': ${pedidos.length}`);
        const stateCounts = {};
        pedidos.forEach(p => {
            stateCounts[p.estado] = (stateCounts[p.estado] || 0) + 1;
        });
        console.log("Pedido states:", stateCounts);

        if (pedidos.length > 0) {
            console.log("\nSample pedidos:");
            pedidos.slice(0, 5).forEach(p => {
                console.log(`- ID: ${p.id}, State: ${p.estado}, Created: ${p.fecha_creacion}`);
            });
        }
    }

    console.log("\nChecking 'pedido_items' table...");
    const { data: items, error: itemsError } = await supabase
        .from('pedido_items')
        .select('id, estado_item, pedido_id');

    if (itemsError) {
        console.error("Error fetching items:", itemsError);
    } else {
        console.log(`Total rows in 'pedido_items': ${items.length}`);
    }
}

diagnose();
