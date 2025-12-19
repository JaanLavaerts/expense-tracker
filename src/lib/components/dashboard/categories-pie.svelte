<script lang="ts">
  import { PieChart } from "layerchart";

  type PieSegment = {
    label: string;
    value: number;
    color?: string;
    categoryKey: number | "uncategorized";
  };

  export let segments: PieSegment[] = [];

  export let onSelectCategory: (segment: PieSegment | null) => void = () => {};

  $: data = segments.filter((s) => s.value > 0);
  $: total = data.reduce((sum, s) => sum + s.value, 0);

  function handleArcClick(_e: MouseEvent, detail: { data: PieSegment }) {
    onSelectCategory?.(detail.data);
  }
</script>

{#if data.length > 0}
  <div class="flex items-center gap-4">
    <div class="w-40 h-40">
      <PieChart
        {data}
        key="label"
        value="value"
        c="color"
        onArcClick={handleArcClick}
      />
    </div>

    <div class="space-y-2 text-sm">
      {#each data as s (s.label)}
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span
              class="inline-block h-3 w-3 rounded-sm"
              style={s.color ? `background-color: ${s.color}` : ""}
            ></span>
            <span class="truncate max-w-[120px]" title={s.label}>{s.label}</span
            >
          </div>
          <span class="font-medium tabular-nums">{s.value.toFixed(2)} EUR</span>
        </div>
      {/each}
    </div>
  </div>
{:else}
  <p class="text-sm text-muted-foreground">No spending data for this period.</p>
{/if}
