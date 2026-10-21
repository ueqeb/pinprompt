<script lang="ts">
	let { label, value }: { label: string; value: string } = $props();
</script>

<div class="rounded-lg border p-4">
	<p class="text-sm text-gray-500">{label}</p>
	<p class="text-2xl font-semibold">{value}</p>
</div>
