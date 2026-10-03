import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ success: false, message: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Lógica futura de conexão com o banco de dados e Prisma vai aqui.
    // Por enquanto, retornamos sucesso simulado para não travar a UI.
    console.log("Recebido arquivo APRs:", file);

    return NextResponse.json({ success: true, message: "Upload simulado com sucesso (banco ainda não configurado)" });
  } catch (error) {
    console.error("Erro no upload:", error);
    return NextResponse.json({ success: false, message: "Erro na requisição" }, { status: 500 });
  }
}
