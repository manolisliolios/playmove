import { API_URL, CacheKeys, Code, PlaygroundApiCache } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";

export function useBuildCode() {
  return useMutation({
    mutationFn: async (codeRequest: Code) => {
      const key = CacheKeys.build(codeRequest);

      if (PlaygroundApiCache.has(key)) {
        return PlaygroundApiCache.get(key);
      }

      const res = await fetch(`${API_URL}/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(codeRequest),
      });

      if (!res.ok) throw new Error("Network error");
      const data = await res.json();

      PlaygroundApiCache.set(key, data);

      return data;
    },
  });
}

export function useFormatCode() {
  return useMutation({
    mutationFn: async (codeRequest: Code) => {
      const key = CacheKeys.format(codeRequest);

      if (PlaygroundApiCache.has(key)) {
        return PlaygroundApiCache.get(key);
      }

      const res = await fetch(`${API_URL}/format`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(codeRequest),
      });

      if (!res.ok) throw new Error("Network error");
      const data = await res.json();

      const response = data?.sources[codeRequest.name] || "";

      PlaygroundApiCache.set(key, response);

      return response;
    },
  });
}
