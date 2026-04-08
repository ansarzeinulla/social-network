export const fetchApi = async (url, options = {}) => {
    const response = await fetch(`http://localhost:8080/api${url}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
        // ЭТА СТРОКА ГАРАНТИРУЕТ, ЧТО КУКИ БУДУТ ОТПРАВЛЯТЬСЯ НА БЭКЕНД!
        credentials: "include",
    });
    return response;
};