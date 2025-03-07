import { world } from '@minecraft/server';

// Evento: Colocar o usar un ítem en un bloque
world.afterEvents.itemUseOn.subscribe(event => {
    const usuario = event.source;
    const objeto = event.itemStack;
    revisarYReabastecer(usuario, objeto);
});

// Evento: Golpear a una entidad con un ítem
world.afterEvents.entityHitEntity.subscribe(event => {
    const atacante = event.damagingEntity;
    const herramienta = obtenerObjetoMano(atacante);
    verificarDesgasteYReabastecer(atacante, herramienta);
});

// Evento: Completar el uso de un ítem (comer, beber, etc.)
world.afterEvents.itemCompleteUse.subscribe(event => {
    const jugador = event.source;
    const objeto = event.itemStack;
    revisarYReabastecer(jugador, objeto);
});

// Evento: Usar un ítem sin apuntar a bloques
world.afterEvents.itemUse.subscribe(event => {
    const quienUsa = event.source;
    const herramienta = event.itemStack;
    revisarYReabastecer(quienUsa, herramienta);
});

// Evento: Romper un bloque con una herramienta
world.afterEvents.playerBreakBlock.subscribe(event => {
    const minero = event.player;
    const herramienta = event.itemStackBeforeBreak;
    revisarYReabastecer(minero, herramienta);
});

// Evento: Detectar ítem tirado y revisar si hay que recargar el slot
world.afterEvents.entitySpawn.subscribe(event => {
    const entidad = event.entity;

    if (entidad.typeId !== "minecraft:item") return;

    const jugadoresCercanos = entidad.dimension.getEntities({
        type: "minecraft:player",
        location: entidad.location,
        maxDistance: 3
    });

    if (jugadoresCercanos.length === 0) return;

    const dueño = jugadoresCercanos.find(j => 
        j.getRotation().x === entidad.getRotation().x &&
        j.getRotation().y === entidad.getRotation().y
    );

    if (!dueño) return;

    const itemSoltado = entidad.getComponent("item").itemStack;
    revisarYReabastecer(dueño, itemSoltado);
});

// Función: Buscar y reemplazar ítem consumido (bloques, comidas, etc.)
function revisarYReabastecer(jugador, objeto) {
    if (!objeto) return;

    if (objeto.amount <= 1) {
        const inventario = jugador.getComponent('inventory').container;
        const slotActual = jugador.selectedSlotIndex;

        for (let slot = 0; slot < inventario.size; slot++) {
            const siguiente = inventario.getItem(slot);
            if (siguiente && siguiente.typeId === objeto.typeId) {
                intercambiar(inventario, slot, slotActual);
                return;
            }
        }
    }
}

// Función: Revisar herramientas rotas y reemplazar
function verificarDesgasteYReabastecer(jugador, herramienta) {
    if (!herramienta) return;

    const durabilidad = herramienta.getComponent("durability");
    if (durabilidad && durabilidad.damage >= durabilidad.maxDurability) {
        const inventario = jugador.getComponent('inventory').container;
        const slotSeleccionado = jugador.selectedSlotIndex;

        // Vaciar la mano porque se rompió
        jugador.getComponent("equippable").getEquipmentSlot("Mainhand").setItem(null);

        // Sonido de rotura
        world.playSound("random.break", jugador.location, {volume: 1});

        for (let pos = 0; pos < inventario.size; pos++) {
            const posibleReemplazo = inventario.getItem(pos);
            if (posibleReemplazo && posibleReemplazo.typeId === herramienta.typeId) {
                intercambiar(inventario, pos, slotSeleccionado);
                return;
            }
        }
    }
}

// Utilidad: Obtener ítem actual de la mano principal
function obtenerObjetoMano(jugador) {
    return jugador.getComponent("equippable")
        .getEquipmentSlot("Mainhand")
        .getItem();
}

// Utilidad: Intercambiar slots dentro del inventario
function intercambiar(contenedor, origen, destino) {
    const itemOrigen = contenedor.getItem(origen);
    const itemDestino = contenedor.getItem(destino);

    contenedor.setItem(origen, itemDestino);
    contenedor.setItem(destino, itemOrigen);
}
