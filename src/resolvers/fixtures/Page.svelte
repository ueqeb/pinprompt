<script lang="ts">
	import Card from './Card.svelte';
	import Wrapper from './Wrapper.svelte';

	let {
		items = ['Revenue', 'Customers', 'Orders'],
		html = '<b>raw</b>'
	}: { items?: string[]; html?: string } = $props();
</script>

<main>
	<h1>Title</h1>

	<section class="cards">
		{#each items as label}
			<Card {label} />
		{/each}
	</section>

	{#if items.length}
		<p class="note">Shown</p>
	{/if}

	<ul>
		{#each [['a', 'b'], ['c', 'd']] as row}
			<li>
				{#each row as cell}
					<span>{cell}</span>
				{/each}
			</li>
		{/each}
	</ul>

	<div class="raw">{@html html}</div>

	<Wrapper><em>wrapped</em></Wrapper>
</main>
