"use client";

import React, { useState, useMemo, useEffect } from "react";

interface CharacterData {
  characterName: string;
  totalDeposited: number;
  transactionCount: number;
  lastDeposit: {
    amount: number;
    date: string;
  };
  transactions: {
    characterName: string;
    amount: number;
    date: string;
    type: string;
  }[];
}

type SortField = "characterName" | "totalDeposited" | "transactionCount";
type SortDirection = "asc" | "desc";

export default function Home() {
  const [data, setData] = useState<CharacterData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cookies, setCookies] = useState("");
  const [characterId, setCharacterId] = useState("269640652");
  const [showInstructions, setShowInstructions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("totalDeposited");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [totalDeposited, setTotalDeposited] = useState(0);

  useEffect(() => {
    const savedCookies = localStorage.getItem("gve_cookies");
    const savedCharId = localStorage.getItem("gve_character_id");
    if (savedCookies) setCookies(savedCookies);
    if (savedCharId) setCharacterId(savedCharId);
  }, []);

  const saveCookies = () => {
    localStorage.setItem("gve_cookies", cookies);
    localStorage.setItem("gve_character_id", characterId);
  };

  const fetchData = async () => {
    if (!cookies.trim()) {
      setError("Введите куки для авторизации");
      setShowInstructions(true);
      return;
    }

    setLoading(true);
    setError(null);
    saveCookies();

    try {
      const response = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookies, characterId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Ошибка загрузки");
      }

      setData(result.data || []);
      setTotalDeposited(result.totalDeposited || 0);
      
      // Показать debug info в консоли
      if (result.debug) {
        console.log("Debug info:", result.debug);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedData = useMemo(() => {
    let filtered = data;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = data.filter((item) =>
        item.characterName.toLowerCase().includes(query)
      );
    }

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "characterName":
          comparison = a.characterName.localeCompare(b.characterName);
          break;
        case "totalDeposited":
          comparison = a.totalDeposited - b.totalDeposited;
          break;
        case "transactionCount":
          comparison = a.transactionCount - b.transactionCount;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, searchQuery, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("ru-RU").format(num);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return "↕";
    return sortDirection === "asc" ? "↑" : "↓";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            Депозиты персонажей GVE
          </h1>
          <p className="text-gray-400 mt-2">
            Парсер журнала транзакций Interlude-Online
          </p>
        </header>

        {/* Cookie Settings */}
        <div className="bg-gray-800 rounded-xl p-4 md:p-6 mb-6 border border-gray-700">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">
                Куки авторизации
              </label>
              <input
                type="text"
                placeholder="Вставьте значение JSESSIONID..."
                value={cookies}
                onChange={(e) => setCookies(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div className="w-full md:w-48">
              <label className="block text-sm text-gray-400 mb-1">
                ID персонажа
              </label>
              <input
                type="text"
                placeholder="269640652"
                value={characterId}
                onChange={(e) => setCharacterId(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:border-yellow-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Загрузка...
                </>
              ) : (
                "Загрузить данные"
              )}
            </button>

            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
            >
              {showInstructions ? "Скрыть инструкцию" : "Как получить куки?"}
            </button>
          </div>

          {showInstructions && (
            <div className="mt-4 p-4 bg-gray-900 rounded-lg text-sm">
              <h3 className="font-semibold text-yellow-400 mb-2">
                Как получить куки:
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-300">
                <li>
                  Откройте{" "}
                  <a
                    href="https://interlude-online.com/auth.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-400 underline"
                  >
                    interlude-online.com
                  </a>{" "}
                  и войдите в аккаунт
                </li>
                <li>
                  Нажмите <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">F12</kbd> для открытия DevTools
                </li>
                <li>
                  Перейдите во вкладку <strong>Application</strong>
                </li>
                <li>
                  Слева выберите <strong>Cookies</strong> → <strong>https://interlude-online.com</strong>
                </li>
                <li>
                  Найдите <code className="px-1.5 py-0.5 bg-gray-700 rounded">JSESSIONID</code> с Path = <code className="px-1.5 py-0.5 bg-gray-700 rounded">/</code> (не /js и не /i)
                </li>
                <li>
                  Дважды кликните на значение, скопируйте и вставьте сюда в формате:{" "}
                  <code className="px-1.5 py-0.5 bg-gray-700 rounded">JSESSIONID=значение</code>
                </li>
              </ol>
              <p className="mt-3 text-gray-500 text-xs">
                Куки сохраняются в вашем браузере и не отправляются никуда кроме interlude-online.com
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            <strong>Ошибка:</strong> {error}
          </div>
        )}

        {/* Search */}
        {data.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Поиск по имени персонажа..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-10 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-yellow-500"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        )}

        {/* Stats */}
        {data.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-gray-400 text-sm">Всего внесено</div>
              <div className="text-xl md:text-2xl font-bold text-green-400">
                {formatNumber(totalDeposited)} a.
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-gray-400 text-sm">Персонажей</div>
              <div className="text-xl md:text-2xl font-bold text-yellow-400">
                {data.length}
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-gray-400 text-sm">Показано</div>
              <div className="text-xl md:text-2xl font-bold text-blue-400">
                {filteredAndSortedData.length}
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-gray-400 text-sm">Топ вкладчик</div>
              <div className="text-xl md:text-2xl font-bold text-purple-400 truncate">
                {data[0]?.characterName || "-"}
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-900/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">#</th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-yellow-400"
                    onClick={() => handleSort("characterName")}
                  >
                    <div className="flex items-center gap-1">
                      Персонаж <span>{getSortIcon("characterName")}</span>
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-yellow-400"
                    onClick={() => handleSort("totalDeposited")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Сумма <span>{getSortIcon("totalDeposited")}</span>
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-yellow-400"
                    onClick={() => handleSort("transactionCount")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Кол-во <span>{getSortIcon("transactionCount")}</span>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase hidden md:table-cell">
                    Последний
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredAndSortedData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      {loading
                        ? "Загрузка данных..."
                        : data.length === 0
                          ? "Введите куки и нажмите \"Загрузить данные\""
                          : "Персонажи не найдены"}
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedData.map((item, index) => (
                    <React.Fragment key={item.characterName}>
                      <tr className="hover:bg-gray-700/50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 font-mono text-sm">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-white">{item.characterName}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-green-400">
                            +{formatNumber(item.totalDeposited)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {item.transactionCount}
                        </td>
                        <td className="px-4 py-3 text-right hidden md:table-cell">
                          <div className="text-green-400 text-sm">
                            +{formatNumber(item.lastDeposit?.amount || 0)}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {item.lastDeposit?.date || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setExpandedRow(expandedRow === item.characterName ? null : item.characterName)}
                            className="text-yellow-400 hover:text-yellow-300"
                          >
                            {expandedRow === item.characterName ? "▲" : "▼"}
                          </button>
                        </td>
                      </tr>
                      {expandedRow === item.characterName && (
                        <tr className="bg-gray-900/30">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="max-h-48 overflow-y-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-gray-500">
                                    <th className="text-left py-1">Дата</th>
                                    <th className="text-right py-1">Сумма</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                  {item.transactions.map((tx, txIndex) => (
                                    <tr key={txIndex} className="text-gray-400">
                                      <td className="py-1">{tx.date}</td>
                                      <td className="py-1 text-right text-green-400">
                                        +{formatNumber(tx.amount)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="mt-8 text-center text-gray-500 text-sm">
          Парсер депозитов GVE • Данные с interlude-online.com
        </footer>
      </div>
    </div>
  );
}
