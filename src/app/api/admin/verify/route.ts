import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    const validPassword = process.env.ADMIN_PASSWORD;
    
    if (!validPassword) {
      console.warn("ADMIN_PASSWORD não configurada no .env. Aceitando qualquer senha para testes.");
      return NextResponse.json({ success: true });
    }

    if (password === validPassword) {
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ success: false, message: "Senha incorreta" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erro na requisição" }, { status: 500 });
  }
}
