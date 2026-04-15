import { jwtVerify } from 'jose';
import { parse } from 'cookie';

const SECRET = new TextEncoder().encode(process.env.ADMIN_SECRET_KEY);

export async function verifyAdmin(req, res) {
  try {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.admin_token;

    if (!token) {
      res.status(401).json({ error: 'غير مصرح - يرجى تسجيل الدخول' });
      return false;
    }

    await jwtVerify(token, SECRET);
    return true;
  } catch (e) {
    res.status(401).json({ error: 'جلسة منتهية - يرجى تسجيل الدخول مجدداً' });
    return false;
  }
}
