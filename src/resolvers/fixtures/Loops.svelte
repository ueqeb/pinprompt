<script lang="ts">
	let { items = ['a', 'b', 'c'] }: { items?: string[] } = $props();
</script>

<div class="multi">
	{#each items as item}
		<dt>{item}</dt>
		<dd>{item}</dd>
	{/each}
</div>

<div class="mixed">
	{#each items as item}
		{#if item === 'a'}
			<h2>{item}</h2>
		{:else}
			<p>{item}</p>
		{/if}
	{/each}
</div>

<div class="sparse">
	{#each items as item}
		{#if item !== 'a'}
			<p>{item}</p>
		{/if}
	{/each}
</div>
