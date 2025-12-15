<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "$lib/components/ui/card";
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "$lib/components/ui/table";
  import * as Dialog from "$lib/components/ui/dialog";
  
  import * as Select from "$lib/components/ui/select";

  export let data: PageData;
  export let form: ActionData;

  let uploading = false;
  let selectedMonth: string = 'all';

  // Edit State
  let editingTransaction: any = null;
  let editDialogOpen = false;

  function openEdit(transaction: any) {
    editingTransaction = transaction;
    editDialogOpen = true;
  }
  
  function formatMonth(monthStr: string) {
    if (monthStr === 'all') return 'All Time';
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  // Compute unique months
  $: months = [...new Set(data.transactions.map(t => t.date.substring(0, 7)))].sort().reverse();
  
  // Filter transactions
  $: filteredTransactions = selectedMonth === 'all' 
    ? data.transactions 
    : data.transactions.filter(t => t.date.startsWith(selectedMonth));

  // Calculate totals for summary cards
  $: totalIncome = filteredTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  $: totalSpent = Math.abs(filteredTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));

</script>

<div class="container mx-auto py-10 space-y-8">
  <div class="flex justify-between items-center">
    <div>
      <h1 class="text-3xl font-bold">Expense Tracker</h1>
      <p class="text-muted-foreground">Track your expenses and categorize them automatically.</p>
    </div>
    <div class="flex gap-2 w-[200px]">
      <!-- Month Selector -->
      <Select.Root type="single" bind:value={selectedMonth}>
        <Select.Trigger>
             {formatMonth(selectedMonth)}
        </Select.Trigger>
        <Select.Content>
            <Select.Item value="all">All Time</Select.Item>
            {#each months as m}
                <Select.Item value={m}>{formatMonth(m)}</Select.Item>
            {/each}
        </Select.Content>
      </Select.Root>
    </div>
  </div>

  <!-- Summary Cards -->
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">Total Income</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold text-green-600">+{totalIncome.toFixed(2)} EUR</div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">Total Spent</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold text-red-600">{totalSpent.toFixed(2)} EUR</div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium">Net Left Over</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold {(totalIncome - totalSpent) >= 0 ? 'text-green-600' : 'text-red-600'}">
           {(totalIncome - totalSpent).toFixed(2)} EUR
        </div>
      </CardContent>
    </Card>
  </div>

  <div class="grid gap-4 md:grid-cols-3">
    <!-- Transactions Area -->
    <div class="md:col-span-2 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <!-- Upload Form -->
          <div class="mb-6 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
             <h3 class="text-sm font-semibold mb-2">Import New Data</h3>
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
              class="flex gap-4 items-end"
            >
              <div class="grid w-full max-w-sm items-center gap-1.5">
                <Input id="file" name="file" type="file" accept=".csv" />
              </div>
              <Button type="submit" disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload CSV'}
              </Button>
            </form>
             {#if form?.success && form.count}
              <p class="text-green-600 mt-2 text-sm">Successfully imported {form.count} transactions.</p>
            {/if}
            {#if form?.error}
              <p class="text-red-600 mt-2 text-sm">{form.error}</p>
            {/if}
          </div>

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
                {#each filteredTransactions as t}
                  <TableRow class="cursor-pointer hover:bg-muted/50" onclick={() => openEdit(t)}>
                    <TableCell class="whitespace-nowrap">{t.date}</TableCell>
                    <TableCell>
                      <div class="font-medium">{t.counterpartyName}</div>
                      <div class="text-xs text-muted-foreground truncate max-w-[200px]" title={t.description}>{t.description}</div>
                    </TableCell>
                    <TableCell class="text-right whitespace-nowrap {t.amount < 0 ? 'text-red-600' : 'text-green-600'}">
                      {t.amount.toFixed(2)} {t.currency}
                    </TableCell>
                    <TableCell>
                      <span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                        {data.categories.find(c => c.id === t.categoryId)?.name || 'Uncategorized'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" class="h-8 w-8 p-0">✎</Button>
                    </TableCell>
                  </TableRow>
                {/each}
                {#if filteredTransactions.length === 0}
                  <TableRow>
                    <TableCell colspan="5" class="text-center h-24 text-muted-foreground">
                      No transactions found for this period.
                    </TableCell>
                  </TableRow>
                {/if}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Sidebar: Category Manager -->
    <div class="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Manage Categories</CardTitle>
          <CardDescription>Create categories and assign keywords for auto-detection.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <!-- Add Category Form -->
          <form method="POST" action="?/createCategory" use:enhance class="flex gap-2">
            <Input name="name" placeholder="New Category (e.g. Food)" required />
            <Button type="submit" variant="secondary">+</Button>
          </form>

          <!-- Add Keyword Form -->
           <div class="pt-4 border-t">
            <h4 class="text-sm font-semibold mb-2">Add Keyword Rule</h4>
            <form method="POST" action="?/addKeyword" use:enhance class="space-y-2">
              <select name="categoryId" class="w-full flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" required>
                <option value="" disabled selected>Select Category</option>
                {#each data.categories as c}
                  <option value={c.id}>{c.name}</option>
                {/each}
              </select>
              <div class="flex gap-2">
                <Input name="keyword" placeholder="Keyword (e.g. Delhaize)" required />
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
                        <Button type="submit" variant="ghost" size="sm" class="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-transparent">
                            <span class="sr-only">Delete</span>
                            🗑️
                        </Button>
                    </form>
                 </div>
                 <div class="flex flex-wrap gap-1">
                    {#each c.keywords as k}
                        <div class="flex items-center gap-1 text-[10px] bg-white dark:bg-black px-1.5 py-0.5 rounded border text-muted-foreground group">
                            <span>{k.keyword}</span>
                            <form method="POST" action="?/deleteKeyword" use:enhance class="contents">
                                <input type="hidden" name="id" value={k.id} />
                                <button type="submit" class="ml-1 text-red-400 hover:text-red-600 font-bold cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                            </form>
                        </div>
                    {/each}
                    {#if c.keywords.length === 0}
                        <span class="text-[10px] italic text-muted-foreground">No keywords</span>
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

<style>
    :global(button) {
        cursor: pointer;
    }
</style>

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
      <form method="POST" action="?/updateCategory" use:enhance={() => {
        return async ({ update }) => {
          await update();
          editDialogOpen = false;
        };
      }} class="space-y-4">
        <input type="hidden" name="transactionId" value={editingTransaction.id} />
        
        <div class="grid gap-2">
          <label class="text-sm font-medium">Title (Counterparty)</label>
          <div class="p-2 border rounded bg-muted font-medium">{editingTransaction.counterpartyName || '-'}</div>
        </div>

        <div class="grid gap-2">
          <label class="text-sm font-medium">Date</label>
          <div class="p-2 border rounded bg-muted">{editingTransaction.date}</div>
        </div>
        
        <div class="grid gap-2">
          <label class="text-sm font-medium">Description</label>
          <div class="p-2 border rounded bg-muted text-sm">{editingTransaction.description}</div>
        </div>

        <div class="grid gap-2">
           <label class="text-sm font-medium bg-background">Category</label>
           <select name="categoryId" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
             <option value="">Uncategorized</option>
             {#each data.categories as c}
               <option value={c.id} selected={editingTransaction.categoryId === c.id}>{c.name}</option>
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
