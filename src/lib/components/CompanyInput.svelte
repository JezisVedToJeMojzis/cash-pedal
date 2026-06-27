<script lang="ts">
	interface Props {
		value?: string;
		id?: string;
		name?: string;
		placeholder?: string;
	}
	let { value = '', id = 'company', name = 'company', placeholder = 'Your company' }: Props =
		$props();

	let suggestions = $state<string[]>([]);
	let timer: ReturnType<typeof setTimeout> | null = null;
	const listId = $derived(`${id}-suggestions`);

	function onInput(e: Event & { currentTarget: HTMLInputElement }) {
		const q = e.currentTarget.value.trim();
		if (timer) clearTimeout(timer);
		if (q.length < 1) {
			suggestions = [];
			return;
		}
		timer = setTimeout(async () => {
			try {
				const res = await fetch(`/api/companies?q=${encodeURIComponent(q)}`);
				if (res.ok) suggestions = await res.json();
			} catch {
				/* ignore network errors — typing still works */
			}
		}, 200);
	}
</script>

<input {id} {name} {placeholder} list={listId} {value} oninput={onInput} autocomplete="off" />
<datalist id={listId}>
	{#each suggestions as s}
		<option value={s}></option>
	{/each}
</datalist>
