<script lang="ts">
	import { classMap } from '@smui/common/internal';
	import TopAppBar, { Row, Section, AutoAdjust } from '@smui/top-app-bar';
	import Drawer, {
		AppContent,
		Content as DContent,
		Header as DHeader,
		Title as DTitle,
		Subtitle as DSubtitle,
		Scrim
	} from '@smui/drawer';
	import List, {
		Item as LItem,
		Text as LText,
		Graphic as LGraphic,
		Separator as LSeparator,
		Subheader as LSubheader
	} from '@smui/list';
	import Tooltip, { Wrapper } from '@smui/tooltip';

	import { deviceOnline } from '$lib/stores';
	import { afterNavigate } from '$app/navigation';
	import IconButton from '@smui/icon-button';
	import { assets } from '$app/paths';
	import { share } from '$lib/share';
	import { setContext } from 'svelte';
	import type { RefreshButtonAnimationContext, RefreshContext, SnackbarContext } from '$lib/types';
	import { writable } from 'svelte/store';
	
	import SimpleSnackbar from '$lib/SimpleSnackbar.svelte';
	import LanguagePicker from '$lib/LanguagePicker.svelte';
	import { msg } from '$lib/i18n';

	import '../theme/extras.scss';
	import type { LayoutData } from './$types';

	afterNavigate(() => (menuOpen = false));
	
	export let data: LayoutData;

	let topAppBar: TopAppBar;
	let headerBar: HTMLDivElement;
	let menuOpen = false;
	let headerBarHeight = NaN;

	let snackbar: SimpleSnackbar;
	let languagePicker: LanguagePicker;

	let snackbarContext: SnackbarContext = {
		open: (...args) => {
			if (!snackbar) throw new Error('Snackbar not defined');
			return snackbar.open(...args);
		},
		error: (...args) => {
			if (!snackbar) throw new Error('Snackbar not defined');
			return snackbar.error(...args);
		},
		close: (...args) => {
			if (!snackbar) throw new Error('Snackbar not defined');
			return snackbar.close(...args);
		}
	};

	setContext('snackbar', snackbarContext);

	// Define a store with a supported flag and contextual data refresh function
	const refreshContext: RefreshContext = writable({
		supported: false,
		onClick: () => {},
		tooltip: ''
	});

	setContext('refreshButton', refreshContext);

	let refreshButtonSpinning = false;
	let timeRefreshButtonWasPressed = 0; // For smooth stopping
	const ANIMATION_TIME = 1000;

	const refreshButtonAnimationContext: RefreshButtonAnimationContext = {
		play: () => {
			refreshButtonSpinning = true;
			timeRefreshButtonWasPressed = Date.now();
		},
		stop: () => {
			// Only set refreshButtonSpinning = false after some multiple of [animation_time] seconds after it started playing
			let timeRemainingInAnimation =
				ANIMATION_TIME - ((Date.now() - timeRefreshButtonWasPressed) % ANIMATION_TIME);
			setTimeout(() => {
				refreshButtonSpinning = false;
			}, timeRemainingInAnimation);
		},
		async autoplay(cb) {
			this.play();
			try {
				await cb();
			}
			catch (err) {
				throw err; // Propagate the error
			}
			finally {
				this.stop();
			}
		}
	};

	setContext('refreshButtonAnimation', refreshButtonAnimationContext);

	// 2023-11-11 JL: SMUI's AutoAdjust behavior led to the header bar not
	//  fully appearing when the page is *just barely* taller than 1vh
	let lastScrollTop = 0;
	let headerBarHidden = false;

	const onScroll = () => {
		// we want to keep as little code as possible in here for performance reasons
		// so anything that persists should be declared outside of it

		let scrollTop = window.scrollY;

		// only update if there was enough of a change
		if (Math.abs(lastScrollTop - scrollTop) <= headerBarHeight) return;

		headerBarHidden = scrollTop > lastScrollTop;
		// // Scrolled down, hide
		// if (scrollTop > lastScrollTop) headerBar.classList.add('hidden');
		// // Scrolled up, show
		// else headerBar.classList.remove('hidden');

		// lastScrollTop will only update in blocks of headerbarHeight since it's after the return
		lastScrollTop = scrollTop;
	};
</script>

<svelte:window on:scroll={onScroll} />

<!-- modal is better but it won't close, so dismissible with position:fixed works -->
<Drawer variant="modal" bind:open={menuOpen} fixed={true}>
	<DHeader>
		{#if data.user && data.org}
			<DTitle>{msg('hello.name', {name: data.user.name})}</DTitle>
			<DSubtitle>{data.org.nickname}</DSubtitle>
		{:else}
			<DTitle>{msg('index.welcome')}</DTitle>
		{/if}
	</DHeader>
	<DContent>
		<List>
			<LItem href="/home">
				<LGraphic class="material-icons" aria-hidden="true">home</LGraphic>
				<LText>{msg('home.title')}</LText>
			</LItem>
			<LItem href="/schedule">
				<LGraphic class="material-icons" aria-hidden="true">calendar_month</LGraphic>
				<LText>Schedule</LText>
			</LItem>
			<LItem href="/">
				<LGraphic class="material-icons" aria-hidden="true">logout</LGraphic>
				<LText>{msg('layout.nav.user.switchorg')}</LText>
			</LItem>
			<LItem href="/login/pick-user">
				<LGraphic class="material-icons" aria-hidden="true">login</LGraphic>
				<LText>Pick user</LText>
			</LItem>
			<LItem href="/preferences">
				<LGraphic class="material-icons" aria-hidden="true">settings</LGraphic>
				<LText>{msg('user.preferences.title')}</LText>
			</LItem>
			<LItem on:click={() => {
				menuOpen = false;
				languagePicker.open();
			}}>
				<LGraphic class="material-icons" aria-hidden="true">language</LGraphic>
				<LText>{msg('language')}</LText>
			</LItem>

			<LSeparator />
			<LSubheader tag="h6">Scouter</LSubheader>
			<LItem href="/scouting/pit">
				<LGraphic class="material-icons" aria-hidden="true">handyman</LGraphic>
				<LText>{msg('scouting.pit')}</LText>
			</LItem>
			<LItem href="/scouting/match">
				<LGraphic class="material-icons" aria-hidden="true">stadium</LGraphic>
				<LText>{msg('scouting.match')}</LText>
			</LItem>
			<LItem href="/sync/scouter">
				<LGraphic class="material-icons" aria-hidden="true">sync</LGraphic>
				<LText>Sync</LText>
			</LItem>

			<LSeparator />
			<LSubheader tag="h6">Lead</LSubheader>
			<!-- <LItem href="/assignments">
				<LGraphic class="material-icons" aria-hidden="true">assignment_ind</LGraphic>
				<LText>Manage assignments</LText>
			</LItem>
			<LItem href="/user/login/lead">
				<LGraphic class="material-icons" aria-hidden="true">login</LGraphic>
				<LText>Log in</LText>
			</LItem> -->
			<LItem href="/sync/lead">
				<LGraphic class="material-icons" aria-hidden="true">sync</LGraphic>
				<LText>Sync</LText>
			</LItem>

			<LSeparator />
			<LItem href="/debug">
				<LGraphic class="material-icons" aria-hidden="true">bug_report</LGraphic>
				<LText>Debug</LText>
			</LItem>
		</List>
	</DContent>
</Drawer>

<Scrim />

<div
	class="header-bar"
	bind:this={headerBar}
	class:slidAway={headerBarHidden}
	bind:clientHeight={headerBarHeight}
>
	<TopAppBar bind:this={topAppBar} variant="static" dense style="z-index: 5">
		<Row>
			<Section>
				<IconButton
					class="material-icons"
					aria-label="Open menu"
					on:click={() => {
						menuOpen = !menuOpen;
					}}>menu</IconButton
				>
				<a href="/home" class="header-logo">
					<img
						src={`${assets}/images/brand-logos/scoutradioz-white-sm.png`}
						alt="Scoutradioz logo"
					/>
				</a>
			</Section>
			<Section align="end" toolbar>
				{#if $refreshContext.supported}
					<Wrapper>
						<IconButton
							class={classMap({
								'material-icons': true,
								refreshButton: true,
								spinning: refreshButtonSpinning
							})}
							aria-label="Sync"
							on:click={async () => {
								if (!$refreshContext.onClick) return;
								refreshButtonAnimationContext.play();
								await $refreshContext.onClick();
								refreshButtonAnimationContext.stop();
							}}
							disabled={!$deviceOnline || refreshButtonSpinning}
						>
							{#if $deviceOnline}
								sync
							{:else}
								sync_disabled
							{/if}
						</IconButton>
						{#if $refreshContext.tooltip}
							<Tooltip>{$refreshContext.tooltip}</Tooltip>
						{/if}
					</Wrapper>
				{/if}
				<!-- <Wrapper> -->
				<!-- 	<IconButton class="material-icons" aria-label="Share" on:click={() => share()} -->
				<!-- 		>qr_code_scanner</IconButton -->
				<!-- 	> -->
				<!-- 	<Tooltip>Share</Tooltip> -->
				<!-- </Wrapper> -->
			</Section>
		</Row>
	</TopAppBar>
</div>

<div id="page">
	<slot />
</div>

<SimpleSnackbar bind:this={snackbar} />
<LanguagePicker bind:this={languagePicker} />

<!-- <BottomNavBar bind:bottomAppBar items={navItems}/> -->

<style lang="scss">
	/* Hide everything above this component. */
	$header-height: 48px;
	.header-bar {
		position: fixed;
		z-index: 5;
		width: 100%;
		top: 0px;
		transition: top 0.15s ease-out;
		// &:global(.slidAway) {
		// 	top: -$header-height;
		// }
	}
	:global(.mdc-top-app-bar) {
		top: 0px;
		// transition: top .15s ease-in-out, box-shadow 200ms linear!important; // todo anim vars
	}
	#page {
		padding-top: $header-height;
	}
	:global(app),
	:global(body),
	:global(html) {
		display: block !important;
		height: auto !important;
		width: auto !important;
		position: static !important;
	}
	:global(.mdc-drawer--modal) {
		top: 0;
	}
	.header-logo {
		height: 100%;
		display: block;
		padding: 6px;
		box-sizing: border-box;
	}
	.header-logo img {
		max-height: 100%;
		max-width: 100%;
		vertical-align: middle;
		padding-left: 8px;
	}
	#page {
		// padding: 0 0.5em;
	}
	:global(.refreshButton:disabled) {
		opacity: 0.7;
	}
	:global(.refreshButton.spinning) {
		animation-name: spinny;
		animation-duration: 1s;
		animation-timing-function: linear;
		animation-iteration-count: infinite;
	}
	@keyframes spinny {
		from {
			transform: rotate(0deg);
		}
		to {
			// JL note: can be 180deg because the icon is symmetrical
			transform: rotate(-180deg);
		}
	}
</style>
