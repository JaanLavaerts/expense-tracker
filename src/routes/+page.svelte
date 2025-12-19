<script lang="ts">
  import type { ActionData } from "./$types";

  // Extend PageData type locally to include uploads from /data
  type Upload = {
    id: string;
    filename: string;
    uploadedAt: string;
    size: number;
  };
  type PageData = {
    transactions: {
      id: number;
      date: string;
      amount: number;
      currency: string | null;
      counterpartyName: string | null;
      description: string | null;
      isFallbackDescription: boolean | null;
      categoryId: number | null;
    }[];
    categories: {
      id: number;
      name: string;
      keywords: { id: number; keyword: string }[];
    }[];
    uploads?: Upload[];
  };
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { FileDropZone } from "$lib/components/ui/file-drop-zone";
  import * as Sidebar from "$lib/components/ui/sidebar";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
  } from "$lib/components/ui/card";
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "$lib/components/ui/table";
  import * as Dialog from "$lib/components/ui/dialog";

  import * as Select from "$lib/components/ui/select";
  import CategoriesPie from "$lib/components/dashboard/categories-pie.svelte";

  export let data: PageData;
  export let form: ActionData;

  let uploading = false;
  let selectedMonth: string = "all";
  let monthInitialized = false;

  // Edit State
  let editingTransaction: any = null;
  let editDialogOpen = false;

  function openEdit(transaction: any) {
    editingTransaction = transaction;
    editDialogOpen = true;
  }

  function formatMonth(monthStr: string) {
    if (monthStr === "all") return "All Time";
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  // Compute unique months (YYYY-MM) from transactions
  $: months = [...new Set(data.transactions.map((t) => t.date.substring(0, 7)))]
    .sort()
    .reverse();

  // Pick the current or closest month as default selection (run once)
  $: if (!monthInitialized && months.length > 0) {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;

    if (months.includes(currentMonthStr)) {
      selectedMonth = currentMonthStr;
    } else {
      const targetTime = new Date(currentMonthStr + "-01").getTime();
      let closest = months[0];
      let closestDiff = Math.abs(
        new Date(months[0] + "-01").getTime() - targetTime
      );

      for (const m of months.slice(1)) {
        const diff = Math.abs(new Date(m + "-01").getTime() - targetTime);
        if (diff < closestDiff) {
          closest = m;
          closestDiff = diff;
        }
      }

      selectedMonth = closest;
    }
    monthInitialized = true;
  }

  // Filter transactions by month
  $: filteredTransactions =
    selectedMonth === "all"
      ? data.transactions
      : data.transactions.filter((t) => t.date.startsWith(selectedMonth));

  // Additional table filters
  let selectedCategoryKey: number | "uncategorized" | null = null;
  let selectedCategoryFilter = "all"; // UI value: "all" | "uncategorized" | category id as string
  let searchQuery = "";

  // Keep selectedCategoryKey in sync with the UI filter value
  $: {
    if (selectedCategoryFilter === "all") {
      selectedCategoryKey = null;
    } else if (selectedCategoryFilter === "uncategorized") {
      selectedCategoryKey = "uncategorized";
    } else {
      const id = Number(selectedCategoryFilter);
      selectedCategoryKey = Number.isNaN(id) ? null : id;
    }
  }

  // Apply category + search filters on top of the month filter
  $: displayedTransactions = filteredTransactions
    .filter((t) => {
      if (selectedCategoryKey === null) return true;
      const key = t.categoryId ?? "uncategorized";
      return key === selectedCategoryKey;
    })
    .filter((t) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      const inDescription = (t.description || "").toLowerCase().includes(q);
      const inCounterparty = (t.counterpartyName || "")
        .toLowerCase()
        .includes(q);
      return inDescription || inCounterparty;
    });

  // Pagination over displayed transactions
  let currentPage = 1;
  const pageSize = 25;

  $: totalPages = Math.max(
    1,
    Math.ceil(displayedTransactions.length / pageSize)
  );

  // Reset to first page when filters change
  $: {
    // This reactive block runs whenever displayedTransactions changes
    currentPage = Math.min(currentPage, totalPages) || 1;
  }

  $: paginatedTransactions = displayedTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Calculate totals for summary cards
  $: totalIncome = filteredTransactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  $: totalSpent = Math.abs(
    filteredTransactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0)
  );

  // Calculate spending per category for pie chart (only negative amounts)
  // Use shadcn chart theme colors so the pie matches the charts docs.
  const pieColors = [
    "var(--color-chart-1)",
    "var(--color-chart-2)",
    "var(--color-chart-3)",
    "var(--color-chart-4)",
    "var(--color-chart-5)",
  ];

  $: categorySpendingSegments = (() => {
    const byCategory = new Map<number | "uncategorized", number>();

    for (const t of filteredTransactions) {
      if (t.amount < 0) {
        const key = t.categoryId ?? "uncategorized";
        byCategory.set(key, (byCategory.get(key) ?? 0) + Math.abs(t.amount));
      }
    }

    const entries = Array.from(byCategory.entries()).map(([key, value]) => {
      const category =
        key === "uncategorized"
          ? null
          : data.categories.find((c) => c.id === key);
      return {
        label: category?.name || "Uncategorized",
        value,
        categoryKey: key,
      };
    });

    // Sort descending by value and attach colors
    return entries
      .sort((a, b) => b.value - a.value)
      .map((entry, index) => ({
        ...entry,
        color: pieColors[index % pieColors.length],
      }));
  })();
</script>

<Sidebar.Provider open={false}>
  <Sidebar.Root side="left" variant="sidebar" collapsible="offcanvas">
    <Sidebar.Content>
      <Sidebar.Group>
        <Sidebar.GroupContent>
          <p class="text-[11px] text-muted-foreground mb-2">
            This dashboard expects CSV exports from Belfius, covering each month
            from the first (1) to the last day of the month (28, 30, or 31).
          </p>
          <form
            method="POST"
            action="?/upload"
            enctype="multipart/form-data"
            use:enhance={() => {
              uploading = true;
              return async ({ update }) => {
                await update();
                uploading = false;
              };
            }}
            class="space-y-3"
          >
            <FileDropZone
              name="file"
              accept=".csv"
              maxFiles={1}
              onUpload={async (_files) => {}}
              class="h-24 text-xs"
            >
              <span class="text-xs text-muted-foreground">
                Drop CSV here or click to browse
              </span>
            </FileDropZone>
            <Button type="submit" size="sm" disabled={uploading} class="w-full">
              {uploading ? "Uploading..." : "Upload CSV"}
            </Button>
          </form>

          <div class="mt-4 space-y-2">
            <p class="text-[11px] font-semibold text-muted-foreground">
              Previous uploads
            </p>
            {#if data.uploads && data.uploads.length > 0}
              <ul class="space-y-1 text-xs">
                {#each data.uploads as u}
                  <li class="flex items-center justify-between gap-2">
                    <div class="min-w-0">
                      <div class="truncate">{u.filename}</div>
                      <div class="text-[11px] text-muted-foreground">
                        {new Date(u.uploadedAt).toLocaleString()} ·
                        {(u.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <a
                      href={`/uploads/${encodeURIComponent(u.id)}`}
                      class="shrink-0 text-[11px] text-primary hover:underline"
                    >
                      Download
                    </a>
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="text-[11px] text-muted-foreground">
                No CSV uploads yet.
              </p>
            {/if}
          </div>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    </Sidebar.Content>
  </Sidebar.Root>

  <div class="container mx-auto py-6 space-y-4">
    <div class="flex justify-between items-center">
      <div>
        <div class="flex items-center gap-2">
          <Sidebar.Trigger />
          <h1 class="text-3xl font-bold">Expense Tracker</h1>
        </div>
        <p class="text-muted-foreground">
          Track your expenses and categorize them automatically.
        </p>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader class="pb-0">
          <CardTitle
            class="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight mb-0"
          >
            Viewing expenses for
          </CardTitle>
        </CardHeader>
        <CardContent class="pt-0">
          <Select.Root type="single" bind:value={selectedMonth}>
            <Select.Trigger
              class="text-3xl font-bold tracking-tight text-left px-0 py-0 h-auto bg-transparent border-0 shadow-none focus-visible:outline-none focus-visible:ring-0 justify-start -mt-6"
            >
              {formatMonth(selectedMonth)}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All Time</Select.Item>
              {#each months as m}
                <Select.Item value={m}>{formatMonth(m)}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-0">
          <CardTitle
            class="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight mb-0"
          >
            Total income
          </CardTitle>
        </CardHeader>
        <CardContent class="pt-0">
          <div class="text-3xl font-bold text-green-600 -mt-6">
            {totalIncome.toFixed(2)} EUR
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-0">
          <CardTitle
            class="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight mb-0"
          >
            Total spent
          </CardTitle>
        </CardHeader>
        <CardContent class="pt-0">
          <div class="text-3xl font-bold text-red-600 -mt-6">
            -{totalSpent.toFixed(2)} EUR
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-0">
          <CardTitle
            class="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight mb-0"
          >
            Net left over
          </CardTitle>
        </CardHeader>
        <CardContent class="pt-0">
          <div
            class="text-3xl font-bold -mt-6 {totalIncome - totalSpent >= 0
              ? 'text-green-600'
              : 'text-red-600'}"
          >
            {(totalIncome - totalSpent).toFixed(2)} EUR
          </div>
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <!-- Transactions Area -->
      <div class="md:col-span-2 space-y-4">
        <Card>
          <CardHeader class="space-y-1">
            <div
              class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between"
            >
              <div>
                <CardTitle
                  >Transactions ({displayedTransactions.length})</CardTitle
                >
                <CardDescription>
                  Showing page {currentPage} of {totalPages}
                </CardDescription>
              </div>

              <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div class="flex items-center gap-2">
                  <Select.Root
                    type="single"
                    bind:value={selectedCategoryFilter}
                  >
                    <Select.Trigger class="h-8 w-[190px] text-xs">
                      {#if selectedCategoryFilter === "all"}
                        All categories
                      {:else if selectedCategoryFilter === "uncategorized"}
                        Uncategorized
                      {:else}
                        {(() => {
                          const activeCategory = data.categories.find(
                            (c) => String(c.id) === selectedCategoryFilter
                          );
                          return activeCategory
                            ? activeCategory.name
                            : "All categories";
                        })()}
                      {/if}
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="all">All categories</Select.Item>
                      <Select.Item value="uncategorized"
                        >Uncategorized</Select.Item
                      >
                      {#each data.categories as c}
                        <Select.Item value={String(c.id)}>{c.name}</Select.Item>
                      {/each}
                    </Select.Content>
                  </Select.Root>
                </div>

                <div class="flex items-center gap-2 w-full sm:w-[260px]">
                  <Input
                    placeholder="Search..."
                    bind:value={searchQuery}
                    class="h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div class="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead class="text-right">Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead class="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {#each paginatedTransactions as t}
                    <TableRow
                      class="cursor-pointer hover:bg-muted/50"
                      onclick={() => openEdit(t)}
                    >
                      <TableCell class="whitespace-nowrap">{t.date}</TableCell>
                      <TableCell>
                        <div class="font-medium">{t.counterpartyName}</div>
                        <div
                          class="text-xs text-muted-foreground truncate max-w-[200px]"
                          title={t.description}
                        >
                          {t.description}
                        </div>
                      </TableCell>
                      <TableCell
                        class="text-right whitespace-nowrap {t.amount < 0
                          ? 'text-red-600'
                          : 'text-green-600'}"
                      >
                        {t.amount.toFixed(2)}
                        {t.currency}
                      </TableCell>
                      <TableCell>
                        <span
                          class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        >
                          {data.categories.find((c) => c.id === t.categoryId)
                            ?.name || "Uncategorized"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" class="h-8 w-8 p-0"
                          >✎</Button
                        >
                      </TableCell>
                    </TableRow>
                  {/each}
                  {#if displayedTransactions.length === 0}
                    <TableRow>
                      <TableCell
                        colspan={5}
                        class="text-center h-24 text-muted-foreground"
                      >
                        No transactions found for this period.
                      </TableCell>
                    </TableRow>
                  {/if}
                </TableBody>
              </Table>
            </div>

            <!-- Pagination controls -->
            <div
              class="mt-3 flex items-center justify-between text-xs text-muted-foreground"
            >
              <span>
                {#if displayedTransactions.length === 0}
                  No transactions to display
                {:else}
                  Showing
                  {(currentPage - 1) * pageSize + 1}
                  -
                  {Math.min(
                    currentPage * pageSize,
                    displayedTransactions.length
                  )}
                  of
                  {displayedTransactions.length}
                {/if}
              </span>

              <div class="inline-flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  class="h-7 w-7 px-0"
                  onclick={() => (currentPage = 1)}
                  disabled={currentPage === 1}
                >
                  «
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  class="h-7 w-7 px-0"
                  onclick={() => (currentPage = Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  ‹
                </Button>
                <span class="mx-1">
                  Page {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  class="h-7 w-7 px-0"
                  onclick={() =>
                    (currentPage = Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages ||
                    displayedTransactions.length === 0}
                >
                  ›
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  class="h-7 w-7 px-0"
                  onclick={() => (currentPage = totalPages)}
                  disabled={currentPage === totalPages ||
                    displayedTransactions.length === 0}
                >
                  »
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Sidebar: Category Manager -->
      <div class="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription
              >Breakdown of your expenses for the selected period.</CardDescription
            >
          </CardHeader>
          <CardContent>
            {#if categorySpendingSegments.length > 0}
              <CategoriesPie
                segments={categorySpendingSegments}
                onSelectCategory={(segment) => {
                  if (!segment) {
                    selectedCategoryFilter = "all";
                    return;
                  }

                  if (selectedCategoryKey === segment.categoryKey) {
                    // Toggle off if clicking the same slice again
                    selectedCategoryFilter = "all";
                  } else if (segment.categoryKey === "uncategorized") {
                    selectedCategoryFilter = "uncategorized";
                  } else {
                    selectedCategoryFilter = String(segment.categoryKey);
                  }
                }}
              />
            {:else}
              <p class="text-sm text-muted-foreground">
                No expenses recorded for this period.
              </p>
            {/if}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manage Categories</CardTitle>
            <CardDescription
              >Create categories and assign keywords for auto-detection.</CardDescription
            >
          </CardHeader>
          <CardContent class="space-y-4">
            <!-- Add Category Form -->
            <form
              method="POST"
              action="?/createCategory"
              use:enhance
              class="flex gap-2"
            >
              <Input
                name="name"
                placeholder="New Category (e.g. Food)"
                required
              />
              <Button type="submit" variant="secondary">+</Button>
            </form>

            <!-- Add Keyword Form -->
            <div class="pt-4 border-t">
              <h4 class="text-sm font-semibold mb-2">Add Keyword Rule</h4>
              <form
                method="POST"
                action="?/addKeyword"
                use:enhance
                class="space-y-2"
              >
                <select
                  name="categoryId"
                  class="w-full flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="" disabled selected>Select Category</option>
                  {#each data.categories as c}
                    <option value={c.id}>{c.name}</option>
                  {/each}
                </select>
                <div class="flex gap-2">
                  <Input
                    name="keyword"
                    placeholder="Keyword (e.g. Delhaize)"
                    required
                  />
                  <Button type="submit">Add</Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-lg">Existing Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              {#each data.categories as c}
                <div class="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <div class="flex justify-between items-center mb-1">
                    <div class="font-medium text-sm">{c.name}</div>
                    <form method="POST" action="?/deleteCategory" use:enhance>
                      <input type="hidden" name="id" value={c.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        class="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-transparent"
                      >
                        <span class="sr-only">Delete</span>
                        🗑️
                      </Button>
                    </form>
                  </div>
                  <div class="flex flex-wrap gap-1">
                    {#each c.keywords as k}
                      <div
                        class="flex items-center gap-1 text-[10px] bg-white dark:bg-black px-1.5 py-0.5 rounded border text-muted-foreground group"
                      >
                        <span>{k.keyword}</span>
                        <form
                          method="POST"
                          action="?/deleteKeyword"
                          use:enhance
                          class="contents"
                        >
                          <input type="hidden" name="id" value={k.id} />
                          <button
                            type="submit"
                            class="ml-1 text-red-400 hover:text-red-600 font-bold cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                            >×</button
                          >
                        </form>
                      </div>
                    {/each}
                    {#if c.keywords.length === 0}
                      <span class="text-[10px] italic text-muted-foreground"
                        >No keywords</span
                      >
                    {/if}
                  </div>
                </div>
              {/each}
              {#if data.categories.length === 0}
                <p class="text-sm text-muted-foreground">No categories yet.</p>
              {/if}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</Sidebar.Provider>

<!-- Edit Dialog -->
<Dialog.Root bind:open={editDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Edit Transaction</Dialog.Title>
      <Dialog.Description>
        Assign a category to this transaction.
      </Dialog.Description>
    </Dialog.Header>

    {#if editingTransaction}
      <form
        method="POST"
        action="?/updateCategory"
        use:enhance={() => {
          return async ({ update }) => {
            await update();
            editDialogOpen = false;
          };
        }}
        class="space-y-4"
      >
        <input
          type="hidden"
          name="transactionId"
          value={editingTransaction.id}
        />

        <div class="grid gap-2">
          <p class="text-sm font-medium">Title (Counterparty)</p>
          <div class="p-2 border rounded bg-muted font-medium">
            {editingTransaction.counterpartyName || "-"}
          </div>
        </div>

        <div class="grid gap-2">
          <p class="text-sm font-medium">Date</p>
          <div class="p-2 border rounded bg-muted">
            {editingTransaction.date}
          </div>
        </div>

        <div class="grid gap-2">
          <p class="text-sm font-medium">Description</p>
          <div class="p-2 border rounded bg-muted text-sm">
            {editingTransaction.description}
          </div>
        </div>

        <div class="grid gap-2">
          <label class="text-sm font-medium bg-background" for="edit-category"
            >Category</label
          >
          <select
            id="edit-category"
            name="categoryId"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Uncategorized</option>
            {#each data.categories as c}
              <option
                value={c.id}
                selected={editingTransaction.categoryId === c.id}
                >{c.name}</option
              >
            {/each}
          </select>
        </div>

        <Dialog.Footer>
          <Button type="submit">Save Changes</Button>
        </Dialog.Footer>
      </form>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<style>
  :global(button) {
    cursor: pointer;
  }
</style>
