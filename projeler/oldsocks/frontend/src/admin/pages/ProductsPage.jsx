// import React, { useState, useEffect } from "react";
// import ProductFormModal from "../modals/ProductFormModal";
// import ProductListPanel from "../panels/ProductListPanel";
// import Window from "../../components/ui/Window";
// import api from "../../../api";

// export default function ProductsPage() {
//   const [products, setProducts] = useState([]);
//   const [activeProduct, setActiveProduct] = useState(null);
//   const [isFormOpen, setIsFormOpen] = useState(false);
//   const [isListFull, setIsListFull] = useState(false);
//   const [loadingList, setLoadingList] = useState(false);

//   useEffect(() => {
//     fetchProducts();
//   }, []);

//   const fetchProducts = async () => {
//     setLoadingList(true);
//     try {
//       const { data } = await api.get("/products");
//       setProducts(data);
//     } catch (e) {
//       console.error(e);
//     } finally {
//       setLoadingList(false);
//     }
//   };

//   const openNewForm = () => {
//     setActiveProduct(null);
//     setIsFormOpen(true);
//   };
//   const openEditForm = async (prod) => {
//     if (prod?.parentProductId && !prod._id) {
//       // Yeni renk oluşturuluyor
//       setActiveProduct(prod); // sadece parentProductId göndereceğiz
//       setIsFormOpen(true);
//       return;
//     }

//     setLoadingList(true);
//     try {
//       const { data } = await api.get(`/products/${prod._id}`);
//       setActiveProduct(data);
//       setIsFormOpen(true);
//     } catch (err) {
//       console.error("Ürün detayları alınamadı", err);
//     } finally {
//       setLoadingList(false);
//     }
//   };

//   const closeForm = () => setIsFormOpen(false);
//   const closeList = () => setIsListFull(false);

//   const onSaved = () => {
//     fetchProducts();
//     closeForm();
//   };

//   return (
//     <div className="p-6 space-y-4">
//       {/* Başlıklar */}
//       <div className="flex space-x-4">
//         <button
//           onClick={openNewForm}
//           className="text-lg font-semibold px-4 py-2 bg-blue-100 rounded hover:bg-blue-200"
//         >
//           Ürün Ekle
//         </button>
//         <button
//           onClick={() => setIsListFull((f) => !f)}
//           className="text-lg font-semibold px-4 py-2 bg-green-100 rounded hover:bg-green-200"
//         >
//           {isListFull ? "Listeyi Küçült" : "Ürün Listesi"}
//         </button>
//       </div>

//       {/* Kısa liste loading */}
//       {loadingList && !isListFull && (
//         <div className="text-center">Ürünler yükleniyor…</div>
//       )}

//       {/* Tam ekran liste */}
//       {isListFull && (
//         <Window title="Ürün Listesi" onClose={closeList}>
//           {loadingList ? (
//             <div className="text-center">Ürünler yükleniyor…</div>
//           ) : (
//             <ProductListPanel
//               products={products}
//               onEdit={openEditForm}
//               onDelete={fetchProducts}
//               isFull
//             />
//           )}
//         </Window>
//       )}

//       {/* Form modal */}
//       {isFormOpen && (
//         <Window
//           title={activeProduct ? "Ürün Düzenle" : "Yeni Ürün"}
//           onClose={closeForm}
//         >
//           <ProductFormModal
//             product={activeProduct}
//             onClose={closeForm}
//             onSaved={onSaved}
//           />
//         </Window>
//       )}
//     </div>
//   );
// }




