<script lang="ts">
	interface Props {
		open: boolean;
		title?: string;
		message?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		danger?: boolean;
		onconfirm: () => void;
		oncancel?: () => void;
	}
	let {
		open = $bindable(),
		title = 'Are you sure?',
		message = '',
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		danger = false,
		onconfirm,
		oncancel
	}: Props = $props();

	function confirm() {
		open = false;
		onconfirm();
	}
	function cancel() {
		open = false;
		oncancel?.();
	}
	function onKey(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') cancel();
	}
</script>

<svelte:window onkeydown={onKey} />

{#if open}
	<div
		class="scrim"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget) cancel();
		}}
	>
		<div class="dialog" role="dialog" aria-modal="true" aria-label={title} tabindex="-1">
			<h3>{title}</h3>
			{#if message}<p class="muted" style="margin:.25rem 0 0">{message}</p>{/if}
			<div class="dialog-actions">
				<button class="btn-ghost" onclick={cancel}>{cancelLabel}</button>
				<button class:btn-danger={danger} onclick={confirm}>{confirmLabel}</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.scrim {
		position: fixed;
		inset: 0;
		background: rgba(2, 6, 23, 0.66);
		backdrop-filter: blur(2px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		z-index: 3000;
		animation: fade 0.12s ease;
	}
	.dialog {
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: 16px;
		padding: 1.25rem;
		width: 100%;
		max-width: 360px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55);
		animation: pop 0.14s ease;
	}
	.dialog h3 {
		margin: 0;
	}
	.dialog-actions {
		display: flex;
		gap: 0.6rem;
		margin-top: 1.25rem;
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
	}
	@keyframes pop {
		from {
			opacity: 0;
			transform: translateY(8px) scale(0.98);
		}
	}
</style>
