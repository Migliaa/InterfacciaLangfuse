import { ItemDaRivedereView } from "@/components/ItemDaRivedereView";
import { caricaCatalogo } from "@/lib/catalogo";
import { caricaProssimoItemDaRivedere } from "@/lib/langfuse";

export default async function Pagina() {
  const [item, catalogo] = await Promise.all([caricaProssimoItemDaRivedere(), caricaCatalogo()]);

  if (!item) {
    return (
      <main className="stato-vuoto">
        <p>Nessun preventivo da rivedere al momento.</p>
      </main>
    );
  }

  return (
    <main>
      <ItemDaRivedereView item={item} catalogo={catalogo} />
    </main>
  );
}
