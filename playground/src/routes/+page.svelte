<script lang="ts">
	import StatCard from '#lib/StatCard.svelte';

	const stats = [
		{ label: 'Revenue', value: '$12,400' },
		{ label: 'Customers', value: '1,204' },
		{ label: 'Orders', value: '318' }
	];
</script>

<main class="mx-auto max-w-3xl space-y-8 p-8">
	<h1 class="text-3xl font-bold">Dashboard</h1>

	<section class="grid grid-cols-3 gap-4">
		{#each stats as stat}
			<StatCard {...stat} />
		{/each}
	</section>

	<section>
		<h2 class="text-xl font-semibold">Legacy stats</h2>
		<p>Old numbers nobody looks at.</p>
	</section>
</main>
