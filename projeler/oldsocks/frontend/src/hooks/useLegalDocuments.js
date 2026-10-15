import { useEffect, useState } from "react";
import { getLegalDocuments } from "../services/legalDocuments";

// { documents, loading } — hata olursa documents boş olur ve sayfalar ilk metni gösterir.
export default function useLegalDocuments() {
  const [state, setState] = useState({ documents: null, loading: true });
  useEffect(() => {
    let alive = true;
    getLegalDocuments()
      .then((documents) => alive && setState({ documents, loading: false }))
      .catch(() => alive && setState({ documents: {}, loading: false }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
