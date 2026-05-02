import { getUserFromRequest } from '../../lib/auth.js';
import { query } from '../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const payload = getUserFromRequest(req);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const result = await query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [payload.id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'User not found' });

    return res.status(200).json({ user: result.rows[0] });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
}
