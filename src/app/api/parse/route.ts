import { NextResponse } from "next/server";

interface Transaction {
  characterName: string;
  amount: number;
  date: string;
  type: string;
}

function parseTransactions(html: string): Transaction[] {
  const transactions: Transaction[] = [];

  // Убираем HTML теги, сохраняя структуру
  const textContent = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");

  // Ищем паттерн: дата + персонаж -> ClanFire: сумма
  // Формат: "16 Mar 19:46 ... ups -> ClanFire: 111 a."
  const fullPattern = /(\d{1,2}\s+\w{3}\s+\d{1,2}:\d{2})[^>]*?(\w+)\s*->\s*ClanFire\s*:\s*(\d+)\s*a\./gi;
  let match;
  
  while ((match = fullPattern.exec(textContent)) !== null) {
    const date = match[1];
    const characterName = match[2];
    const amount = parseInt(match[3], 10);
    
    if (characterName && amount > 0 && characterName.toLowerCase() !== "clanfire") {
      transactions.push({
        characterName,
        amount,
        date,
        type: "Покупка",
      });
    }
  }

  // Если полный паттерн не сработал, ищем без даты
  if (transactions.length === 0) {
    const simplePattern = /(\w+)\s*->\s*ClanFire\s*:\s*(\d+)\s*a\./gi;
    let txIndex = 0;
    
    // Сначала соберём все даты
    const dates = textContent.match(/\d{1,2}\s+\w{3}\s+\d{1,2}:\d{2}/g) || [];
    
    while ((match = simplePattern.exec(textContent)) !== null) {
      const characterName = match[1];
      const amount = parseInt(match[2], 10);
      
      if (characterName && amount > 0 && characterName.toLowerCase() !== "clanfire") {
        transactions.push({
          characterName,
          amount,
          date: dates[txIndex] || `tx_${txIndex}`,
          type: "Покупка",
        });
        txIndex++;
      }
    }
  }

  console.log("Найдено транзакций:", transactions.length);

  return transactions;
}

function findTotalPages(html: string): number {
  let totalPages = 1;

  // Ищем все ссылки с p=N
  const pLinks = html.match(/p=\d+/g) || [];
  console.log("Найдены p= ссылки:", pLinks);

  const hrefMatches = html.matchAll(/p=(\d+)/g);
  for (const match of hrefMatches) {
    const pageNum = parseInt(match[1], 10);
    if (pageNum > totalPages) totalPages = pageNum;
  }

  // Ищем пагинацию в разных форматах
  const paginationArea = html.match(/class="[^"]*pag[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi);
  console.log("Область пагинации:", paginationArea?.slice(0, 2));

  console.log("Определено страниц:", totalPages);
  return totalPages;
}

function parseDate(dateStr: string): Date {
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const match = dateStr.match(/(\d{1,2})\s+(\w{3})\s+(\d{1,2}):(\d{2})/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = months[match[2]] || 0;
    const hour = parseInt(match[3], 10);
    const minute = parseInt(match[4], 10);
    return new Date(2025, month, day, hour, minute);
  }
  return new Date(0);
}

async function fetchCharacterAdena(cookies: string, characterId: string): Promise<number> {
  try {
    // Страница информации о персонаже
    const url = `https://interlude-online.com/lk.php?page=characterInfo&characterId=${characterId}`;
    console.log("Запрос Adena:", url);
    
    const response = await fetch(url, {
      headers: {
        Cookie: cookies,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: "https://interlude-online.com/lk.html",
      },
    });

    if (!response.ok) {
      console.log("Ошибка запроса Adena:", response.status);
      return 0;
    }

    const html = await response.text();
    const textContent = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    
    // Ищем Adena в разных форматах
    // Формат: "Adena: 123456" или "Adena 123 456" или просто число после Adena
    const adenaPatterns = [
      /Adena[:\s]+([0-9\s,.']+)/i,
      /Adena<[^>]*>([0-9\s,.']+)/i,
    ];
    
    for (const pattern of adenaPatterns) {
      const match = html.match(pattern) || textContent.match(pattern);
      if (match) {
        const adenaStr = match[1].replace(/[\s,.']/g, "").trim();
        const adena = parseInt(adenaStr, 10);
        if (adena > 0) {
          console.log("Найдена Adena:", adena);
          return adena;
        }
      }
    }

    // Поиск в таблице - ищем строку с Adena и следующее число
    const tableMatch = textContent.match(/Adena[^0-9]*([0-9]+)/i);
    if (tableMatch) {
      const adena = parseInt(tableMatch[1], 10);
      console.log("Найдена Adena в таблице:", adena);
      return adena;
    }

    console.log("Adena не найдена. Превью HTML:", textContent.substring(0, 1000));
    return 0;
  } catch (error) {
    console.error("Ошибка получения Adena:", error);
    return 0;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { cookies, characterId } = body;

    if (!cookies) {
      return NextResponse.json(
        { error: "Требуются куки для авторизации" },
        { status: 400 }
      );
    }

    // Если пользователь вставил только значение без JSESSIONID=
    if (!cookies.includes("=")) {
      cookies = `JSESSIONID=${cookies}`;
    }

    const charId = characterId || "269640652";
    const allTransactions: Transaction[] = [];
    let totalPages = 1;

    const firstPageUrl = `https://interlude-online.com/lk.php?page=characterLog&characterId=${charId}&p=1`;
    
    console.log("Запрос к:", firstPageUrl);
    console.log("Куки:", cookies.substring(0, 50) + "...");

    const firstResponse = await fetch(firstPageUrl, {
      headers: {
        Cookie: cookies,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
        Referer: "https://interlude-online.com/lk.html",
      },
    });

    console.log("Статус ответа:", firstResponse.status);

    if (!firstResponse.ok) {
      return NextResponse.json(
        { error: `Ошибка запроса: ${firstResponse.status}` },
        { status: firstResponse.status }
      );
    }

    const firstHtml = await firstResponse.text();
    console.log("Длина HTML:", firstHtml.length);
    
    // Debug: ищем все паттерны платежей
    const textOnly = firstHtml.replace(/<[^>]+>/g, " ");
    const allPayments = textOnly.match(/\w+\s*->\s*ClanFire[^<\n]*/gi);
    console.log("Все платежи ClanFire:", allPayments?.slice(0, 5));

    if (firstHtml.includes("авторизуйтесь") || firstHtml.includes("Пожалуйста, авторизуйтесь")) {
      return NextResponse.json(
        { error: "Куки недействительны или истекли. Получите новые куки." },
        { status: 401 }
      );
    }

    totalPages = findTotalPages(firstHtml);
    console.log("Всего страниц найдено:", totalPages);
    
    // Если пагинация не найдена, пробуем загрузить до 10 страниц
    if (totalPages === 1) {
      totalPages = 10; // Попробуем загрузить больше страниц
      console.log("Пагинация не найдена, пробуем 10 страниц");
    }
    
    const firstTransactions = parseTransactions(firstHtml);
    allTransactions.push(...firstTransactions);
    console.log("Транзакций со страницы 1:", firstTransactions.length);

    for (let pageNum = 2; pageNum <= Math.min(totalPages, 50); pageNum++) {
      console.log(`Загрузка страницы ${pageNum}...`);
      const pageUrl = `https://interlude-online.com/lk.php?page=characterLog&characterId=${charId}&p=${pageNum}`;
      
      const pageResponse = await fetch(pageUrl, {
        headers: {
          Cookie: cookies,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          Referer: "https://interlude-online.com/lk.html",
        },
      });

      if (pageResponse.ok) {
        const pageHtml = await pageResponse.text();
        const pageTransactions = parseTransactions(pageHtml);
        
        if (pageTransactions.length === 0) {
          console.log(`Страница ${pageNum} пустая, останавливаем`);
          break;
        }
        
        allTransactions.push(...pageTransactions);
        console.log(`Транзакций со страницы ${pageNum}:`, pageTransactions.length);
      } else {
        console.log(`Ошибка загрузки страницы ${pageNum}:`, pageResponse.status);
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    
    console.log("Всего транзакций до дедупликации:", allTransactions.length);

    const uniqueTransactions = allTransactions.filter((tx, index, self) => {
      return (
        index ===
        self.findIndex(
          (t) =>
            t.characterName === tx.characterName &&
            t.amount === tx.amount &&
            t.date === tx.date
        )
      );
    });

    const aggregated = uniqueTransactions.reduce(
      (acc, tx) => {
        if (!acc[tx.characterName]) {
          acc[tx.characterName] = {
            characterName: tx.characterName,
            totalDeposited: 0,
            transactionCount: 0,
            transactions: [],
            lastDeposit: { amount: 0, date: "" },
          };
        }
        acc[tx.characterName].totalDeposited += tx.amount;
        acc[tx.characterName].transactionCount += 1;
        acc[tx.characterName].transactions.push(tx);

        const currentDate = parseDate(tx.date);
        const lastDate = parseDate(acc[tx.characterName].lastDeposit.date);
        if (currentDate > lastDate) {
          acc[tx.characterName].lastDeposit = { amount: tx.amount, date: tx.date };
        }

        return acc;
      },
      {} as Record<
        string,
        {
          characterName: string;
          totalDeposited: number;
          transactionCount: number;
          transactions: Transaction[];
          lastDeposit: { amount: number; date: string };
        }
      >
    );

    const sortedData = Object.values(aggregated).sort(
      (a, b) => b.totalDeposited - a.totalDeposited
    );

    const totalDeposited = sortedData.reduce((sum, item) => sum + item.totalDeposited, 0);

    // Получаем текущую Adena на персонаже
    const currentAdena = await fetchCharacterAdena(cookies, charId);
    console.log("Текущая Adena:", currentAdena);

    return NextResponse.json({
      success: true,
      data: sortedData,
      totalTransactions: uniqueTransactions.length,
      totalPages,
      totalDeposited,
      currentAdena,
    });
  } catch (error) {
    console.error("Parse error:", error);
    return NextResponse.json(
      {
        error: "Ошибка парсинга",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
