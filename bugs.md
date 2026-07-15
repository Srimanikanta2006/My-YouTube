# YouTube Clone - Bug Investigation & Fix Log

This file documents the bugs resolved during development, explaining the root cause, what code was modified, and how it resolves the issue.

---

## Bug 1: Screen Flashing / Video List Not Refreshing After Upload

### 🔴 Symptom
When a user uploads a new video from their channel page, the upload succeeds, but the new video does not show up in the video list below. The user has to manually reload the entire browser page (which flashes the screen) to see it.

### 🔍 Root Cause
The channel detail page (`channel/[id]/index.tsx`) stored the videos array in a React state `const [videos, setVideos] = useState([])`. It fetched the list from the database only when the component mounted. 

When the child component `VideoUploader` finished uploading the file to the backend, it reset its form and displayed a success toast, but did not notify the parent channel page to refresh its state. Consequently, the UI remained unchanged until the page was reloaded.

### 🛠️ The Fix & Code Involved
I established a callback channel between the parent page and the child uploader component:

1. **Callback Propagation**:
   * **File**: [channel/[id]/index.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/pages/channel/%5Bid%5D/index.tsx)
   * **Action**: Passed the `fetchChannelVideos` function as a prop named `onUploadSuccess` to `<VideoUploader />`:
     ```typescript
     <VideoUploader
       channelId={id}
       channelName={channel?.channelname}
       onUploadSuccess={fetchChannelVideos} // <-- Hooked up the callback
     />
     ```

2. **Trigger Callback**:
   * **File**: [VideoUploader.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/VideoUploader.tsx)
   * **Action**: Accepted `onUploadSuccess` in the props and invoked it in the `.then()` chain of the upload request:
     ```typescript
     const VideoUploader = ({ channelId, channelName, onUploadSuccess }: any) => {
       // ...
       const handleUpload = async () => {
         // ...
         try {
           const res = await axiosInstance.post("/video/upload", formdata, ...);
           toast.success("Upload successfully");
           resetForm();
           if (onUploadSuccess) {
             onUploadSuccess(); // <-- Refetches the channel videos immediately
           }
         } catch (error) { ... }
       };
     };
     ```

### ✨ Result
As soon as the video file finishes uploading, `fetchChannelVideos` is invoked, fetching the fresh database list and immediately updating the parent's `videos` state. The UI rerenders instantly, displaying the new video without any manual refresh or browser flashing!

---

## Feature 1: Collapsible & Responsive Sidebar Toggle

### 🟢 Requirement
Implement a fully functional hamburger toggle for the sidebar.
1. Clicking the hamburger button in the header should toggle the sidebar collapse state.
2. In the collapsed state, the sidebar should hide labels and center the icons for a compact layout.
3. On mobile screens, the sidebar should collapse out of view entirely, and expand as an overlay drawer with a dark backdrop clicking outside to close.

### 🔍 Architecture & State Bridging
The `<Header />` and `<Sidebar />` components are independent sibling nodes mounted in `layout.tsx` (App Router) and `_app.tsx` (Pages Router). 

To cleanly share state between them without complex prop drilling, we utilized the global authentication context `AuthContext.js`, which wraps both layout files. We added a global state `isSidebarCollapsed` and a toggle handler `toggleSidebar` inside this context.

### 🛠️ Code Modified & Involved
1. **Global Context Setup**:
   * **File**: [AuthContext.js](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/lib/AuthContext.js)
   * **Action**: Declared a state `isSidebarCollapsed` and a function `toggleSidebar` to update it, adding both to the context Provider's `value` object.
2. **Trigger (Hamburger Click)**:
   * **File**: [Header.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/Header.tsx)
   * **Action**: Retrieved `toggleSidebar` from `useUser()` and bound it to the `onClick` event on the hamburger Menu button.
3. **UI/UX Response**:
   * **File**: [Sidebar.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/Sidebar.tsx)
   * **Action**:
     * Retrieved `isSidebarCollapsed` and `toggleSidebar` from `useUser()`.
     * Added CSS transitions `transition-all duration-300` to animate between `w-64` and `w-16` on desktop.
     * Toggled label visibility `{!isSidebarCollapsed && <span>Label</span>}` and button alignments dynamically.
     * Added responsive layout: on mobile, the sidebar is either hidden or displays as an overlay `fixed z-50 top-14 left-0 h-[calc(100vh-56px)] shadow-lg` with a click-to-close backdrop shadow overlay.

---

## Bug 2: Sidebar State Resets/Expands on Page Navigation

### 🔴 Symptom
When a user collapses the sidebar and navigates to another page (e.g. from the Home page `/` in the App Router to the Watch Later `/watch-later` page in the Pages Router), the sidebar automatically resets and expands back to its default full-width state. The user has to collapse it again manually.

### 🔍 Root Cause
In Next.js, switching between App Router and Pages Router routes causes a full layout context reload on the client. Because of this, the React state `isSidebarCollapsed` inside `AuthContext.js` was reset back to its default value (`false`).

### 🛠️ The Fix & Code Involved
*   **File**: [AuthContext.js](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/lib/AuthContext.js)
*   **Action**: Persisted the user's preference in the browser's `localStorage` and restored it on component mount:
    *   Toggling: Stores the state boolean string inside `localStorage.setItem("sidebarCollapsed", ...)` on click.
    *   Mounting: Uses a client-side `useEffect` hook to read the state from `localStorage` and set it on the component after mounting.
    *   *Why a mounting hook?* Initializing the state directly from `localStorage` during initial state declarations breaks Server-Side Rendering (Next.js SSR), throwing hydration errors since `localStorage` is undefined on the server. Initializing to `false` first and loading from storage in a `useEffect` prevents hydration mismatches.

---

## Feature 2: Active Sidebar Link Highlighting

### 🟢 Requirement
Highlight the active menu tab in the sidebar layout (e.g. have a light-gray background and bold text/icon) depending on which page the user is currently viewing.

### 🔍 Path Detection across Next.js Routers
Because the project uses a hybrid configuration of both Next.js App Router (for the homepage `/`) and Next.js Pages Router (for `/watch`, `/liked`, etc.), using the default router module from `next/router` would cause import crashes on App Router components.

To resolve this, we imported `usePathname` from `next/navigation`, which is the unified Next.js API that returns the active path consistently across both layout architectures.

### 🛠️ Code Modified & Involved
*   **File**: [Sidebar.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/Sidebar.tsx)
*   **Action**:
    *   Retrieved the current path string using `const pathname = usePathname();`.
    *   Created a helper function `isActive(href)` to check if the route is exact `/` (Home) or prefix-matches (e.g. `pathname.startsWith(href)` for secondary pages like `/channel/[id]`).
    *   Conditionally updated the component style: if active, set `variant="secondary"` (light gray background) and added `font-semibold text-black` classes; otherwise, fallback to `variant="ghost"` and `text-gray-700`.

---

## Bug 3: Sidebar Transition Animation Lag

### 🔴 Symptom
When toggling the hamburger menu, the sidebar has a sliding transition animation that feels laggy, heavy, or sluggish. 

### 🔍 Solution
In premium, high-traffic user interfaces (like YouTube), transitions that animate the width of full structural blocks (like sidebars) can cause layout reflows on the browser rendering engine, which feels sluggish. To achieve a modern, crisp, and high-performance UX, layout switches should happen instantly.

### 🛠️ The Fix & Code Involved
*   **File**: [Sidebar.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/Sidebar.tsx)
*   **Action**: Removed the `transition-all` and `duration-300` classes from `sidebarClasses` styles. The sidebar now snaps instantly to the target width, delivering a lightweight and professional desktop feel.

---

## Bug 4: Sidebar Flashing/Flickering on Route Navigation

### 🔴 Symptom
When navigating from a Pages Router page (e.g. `/liked`) back to the Homepage `/` or `/explore`, the sidebar briefly expands to full width (`w-64`) and then collapses back (`w-16`) in a fraction of a second. This flash only occurs on those specific transitions.

### 🔍 Root Cause
Next.js uses a dual-routing system: the **App Router** (where `/` was served) and the **Pages Router** (where `/liked`, `/watch-later` are served). 

When crossing boundaries between the App Router and Pages Router, Next.js cannot perform standard single-page application (SPA) client-side transitions; it triggers a **full browser window document reload**. When this full document reload happened:
1. The page booted up and initialized the React context `isSidebarCollapsed` to `false` (default expanded).
2. The browser painted this expanded state.
3. The mounting `useEffect` inside `AuthContext.js` executed, read `true` from `localStorage`, and toggled it back to collapsed, causing a visual flicker.

### 🛠️ The Fix & Code Involved
To solve the root cause, I unified the entire application's routing framework:

1. **Homepage Relocation**:
   * **Action**: Created [index.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/pages/index.tsx) inside `src/pages` (Pages Router) rendering the exact same homepage layout. Deleted the old App Router folder `src/app`.
2. **Styles Relocation**:
   * **Action**: Recreated the global Tailwind stylesheet at [globals.css](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/styles/globals.css) and updated the import path in [\_app.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/pages/_app.tsx) to point to `@/styles/globals.css`.
3. **Type Checker Exclude**:
   * **Action**: Updated [tsconfig.json](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/tsconfig.json) to exclude `.next` and remove duplicate Next.js App Router internal validator type check references.

### ✨ Result
Because the homepage is now served by the Pages Router under the exact same React tree layout (`_app.tsx`), all page navigations (e.g., clicking Home, Explore, or Liked Videos) are handled via standard **client-side SPA routing**. The component tree is never destroyed, state is fully preserved in memory, and the sidebar **never flashes or resets**!

---

## Feature 3: Dynamic Video Duration Parsing & Display

### 🟢 Requirement
Replace the hardcoded `10:24` video duration timestamp display on homepage video cards with the correct length of each video.

### 🔍 Solution & Pipeline
To calculate the duration of uploaded files, we avoid heavy backend dependencies (like `ffmpeg`) by analyzing video metadata directly on the client side using standard HTML5 APIs. When a file is selected, we load it into an in-memory `<video>` player, read its `duration`, format it as `MM:SS` (or `H:MM:SS`), and append it to the file metadata upload payload.

### 🛠️ Code Modified & Involved
1. **Database Schema Setup**:
   * **File**: [video.js](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/server/Modals/video.js)
   * **Action**: Cleaned up a duplicate `filename` key and added a `videoduration` property.
2. **Backend Seed & Controller**:
   * **Files**: [index.js](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/server/index.js), [video.js](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/server/Controllers/video.js)
   * **Action**:
     * Added static `videoduration` fields to default seed videos (e.g., Big Buck Bunny as `"10:07"`).
     * Configured the upload controller to read `videoduration` from the request body and save it.
3. **Uploader Handler**:
   * **File**: [VideoUploader.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/VideoUploader.tsx)
   * **Action**: Created a temporary HTML5 `<video>` tag inside `handlefilechange`. Loaded the file metadata, calculated `duration` dynamically, formatted it, and sent it inside the `FormData` as `videoduration`.
4. **Card UI Badge**:
   * **File**: [Videocard.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/Videocard.tsx)
   * **Action**: Replaced the hardcoded `10:24` text block inside the badge wrapper with `{video?.videoduration || "00:00"}`.

---

## Feature 4: Responsive Mobile Search Overlay (Header)

### 🟢 Requirement
Ensure the website header works cleanly on small mobile viewports (e.g. 320px to 480px width) without elements wrapping, overlapping, or clipping off the screen.

### 🔍 Solution & Interactions
Desktop headers fit a search input box, logo, uploader, notifications, and avatar side-by-side. On mobile, this causes visual squishing. 

To resolve this, we implemented a dynamic mobile search layout:
1. Under `sm` screen sizes, the permanent search input bar is hidden (`hidden sm:flex`).
2. An expandable mobile Search icon button is added (`sm:hidden`).
3. Clicking this icon sets `isMobileSearchOpen` to `true`, rendering a full-width header search input box with a back arrow to collapse it, matching standard native app designs.
4. Secondary items (Bell, VideoIcon, Mic) are hidden on mobile to conserve header space.

### 🛠️ Code Modified & Involved
*   **File**: [Header.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/Header.tsx)
*   **Action**: Implemented the conditional search overlay state, mobile icon button, and responsive layout classes.

---

## Feature 5: Horizontal Scrollbar Removal (CategoryTabs & Channeltabs)

### 🟢 Requirement
Enable clean swipe/scroll tabs menus on mobile and tablet screens without ugly desktop horizontal scrollbars appearing.

### 🛠️ Code Modified & Involved
1. **Utility Declaration**:
   * **File**: [globals.css](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/styles/globals.css)
   * **Action**: Added a Tailwind `@utility scrollbar-none` class that sets `scrollbar-width: none` (Firefox), `-ms-overflow-style: none` (IE/Edge), and hides the `::-webkit-scrollbar` webkit selectors.
2. **Tab Elements Update**:
   * **Files**: [category-tabs.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/category-tabs.tsx), [Channeltabs.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/Channeltabs.tsx)
   * **Action**: Added the `.scrollbar-none` class to the scrollable container elements.

---

## Bug 5: Runtime TypeError: Cannot read properties of null (reading '_id') in Playlists

### 🔴 Symptom
When visiting the Watch Later list, Liked Videos, or History page, the application crashes completely showing:
`TypeError: Cannot read properties of null (reading '_id')` inside the `Array.map` rendering loop.

### 🔍 Root Cause
When a user adds a video to their Watch Later list, Liked Videos, or History, a relation record is saved in MongoDB referencing the video's ID (`videoid`). 

If that video is later deleted from the database (e.g. during a database reset, seed update, or manual deletion), the relation record still exists in the user's playlist collection, but its populated `videoid` reference resolves to `null`. When mapping over the items and reading `item.videoid._id` or `item.videoid.videotitle`, the app attempts to dereference properties of `null`, crashing the React render process.

### 🛠️ The Fix & Code Involved
I added defensive API payload filters in the data-fetching hooks of all three playlist layout panels:
1. **Watch Later page**:
   * **File**: [WatchLaterContent.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/WatchLaterContent.tsx)
   * **Action**: Filtered loaded records to keep only elements where `item.videoid` is not null:
     `const validItems = (watchLaterData.data || []).filter((item: any) => item && item.videoid);`
2. **Liked Videos page**:
   * **File**: [LikedContent.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/LikedContent.tsx)
   * **Action**: Filtered loaded records to keep only elements where `item.videoid` is not null:
     `const validItems = (likedData.data || []).filter((item: any) => item && item.videoid);`
3. **History page**:
   * **File**: [HistoryContent.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/HistoryContent.tsx)
   * **Action**: Filtered loaded records to keep only elements where `item.videoid` is not null:
     `const validItems = (historyData.data || []).filter((item: any) => item && item.videoid);`

### ✨ Result
Any orphaned records pointing to deleted videos are safely ignored by the client UI, preventing crashes and allowing the user's pages to render perfectly.

---

## Feature 6: Homepage Interactive Category Filtering & Upload Categorization

### 🟢 Requirement
Make the horizontal category tags row at the top of the homepage (All, Music, Gaming, Tech, etc.) filter the main video grid dynamically, supporting both the default seeded videos and newly uploaded videos.

### 🔍 Solution & Design Decisions
To implement categorization perfectly for both existing and future video uploads:
1. **Database Schema Integration**:
   * Added a `videocategory` string field to the video model schema.
   * Updated the seed video script to pre-categorize the default Blender movies (e.g. Big Buck Bunny as `"Comedy"`, Sintel as `"Gaming"`, etc.).
   * Configured the upload controller to read and save `videocategory` parameters.
2. **Frontend Uploader Dropdown**:
   * Added a `<select>` menu inside the upload form so the user can choose the category of the video before uploading.
   * Appended the selected category to the `FormData` upload payload as `videocategory`.
3. **Filtering & Keyword Fallbacks**:
   * Shared the selected tab state (`selectedCategory`) between the tab row and the video grid on the homepage.
   * Updated the grid filter logic to match by direct database category comparison (`video.videocategory === selectedCategory`). Added a keyword-based matcher as a fallback for older unassigned uploads.

### 🛠️ Code Modified & Involved
1. **Database Model**:
   * **File**: [video.js](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/server/Modals/video.js)
   * **Action**: Added the `videocategory` field with a default of `"All"`.
2. **Backend Seed & Controller**:
   * **Files**: [index.js](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/server/index.js), [video.js](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/server/Controllers/video.js)
   * **Action**: Configured uploader and default seeds to write `videocategory`.
3. **Uploader Dropdown UI**:
   * **File**: [VideoUploader.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/VideoUploader.tsx)
   * **Action**: Added selection state, reset logic, dropdown UI markup, and payload appends.
4. **Grid Filtering**:
   * **Files**: [index.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/pages/index.tsx), [category-tabs.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/category-tabs.tsx), [Videogrid.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/Videogrid.tsx)
   * **Action**: Connected state hooks and implemented direct DB category matching with keyword-based fallbacks.

---

## Feature 7: Watch Page Polish (Share Clipboard Copy & Direct Download)

### 🟢 Requirement
Implement a clipboard copy utility with a toast notification for "Share," and hook up the "Download" button to fetch and download the raw video file.

### 🔍 Solution & Interactions
1. **Share Button**:
   * Implemented `navigator.clipboard.writeText(window.location.href)` to copy the current watch page URL directly to the user's system clipboard.
   * Triggered a success toast notification: `"Link copied to clipboard!"`.
2. **Download Button**:
   * Resolved the absolute video source file path URL.
   * Replaced the standard browser alert/toast overlay with a responsive inline button state transition:
     * **Loading state**: Changes the download icon to a spinning circle loader, disables the button to prevent duplicate fetches, and updates text to `"Downloading..."`.
     * **Success state**: Smoothly updates the button style to soft green (`bg-green-100 text-green-800`), transforms the icon to a bouncing celebration emoji `🎉`, and sets the text to `"Saved!"`. Reverts back to standard idle state after 3 seconds.
   * Fetched the file directly as a binary `Blob` object from the server in the background.
   * Programmatically generated an in-memory object URL (`window.URL.createObjectURL(blob)`), attached it to a temporary virtual anchor tag with a sanitized filename, triggered the download, and cleaned up the references. This forces a direct file download dialog to open in the user's browser, rather than just playing the file in a new browser tab.
   * Falls back to opening the video in a new tab if direct download fails due to network issues.

### 🛠️ Code Modified & Involved
*   **Action**: Declared the `downloadState` state hook, adjusted the `handleDownload` logic block, and replaced the button markup to support active loading/success state checks.

---

## Feature 8: Fixed Header and Sidebar Layout

### 🟢 Requirement
Keep the top header navigation bar and the left sidebar fixed in place on scroll, so that only the main video content scroll window moves.

### 🔍 Solution & Interactions
To mimic YouTube's standard sticky layout layout:
1. **Fixed Header**: Applied `fixed top-0 left-0 right-0 z-50` to the `<header>` block, and added a top padding offset `pt-14` on the outer layout wrapper.
2. **Fixed Sidebar**: Reconfigured the sidebar classes to sit at `fixed left-0 top-14 bottom-0 z-40 overflow-y-auto`. This secures it underneath the header and allows it to scroll internally if the nav list overflows.
3. **Dynamic Content Margin**: Refactored `_app.tsx` using a nested `Layout` child to use the `useUser` context hook. It dynamically shifts the main content body right using `md:pl-16` (when sidebar is collapsed) or `md:pl-64` (when sidebar is expanded) to prevent content from getting covered by the fixed components.

---

## Bug 6: Mobile Sidebar Drawer Flashing & Auto-Collapse on Route Change

### 🔴 Symptoms
1. **Flashing**: Every time the app loads on mobile, the sidebar briefly expands full-width and closes.
2. **Stuck menu**: On mobile viewports, when the menu drawer is expanded and a user clicks a page link (e.g. Liked Videos), the sidebar remains open, blocking the view of the new page.

### 🔍 Root Cause & Fixes
1. **Flashing Cause**: The React context initialized `isSidebarCollapsed` to `false` (expanded). During initial client paint, the mobile drawer showed up open, and then collapsed after `useEffect` loaded.
   * **Fix**: Defaulted `isSidebarCollapsed` state to `true` (collapsed/hidden) inside [AuthContext.js](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/lib/AuthContext.js). Desktop triggers check viewport width and expand on mount.
2. **Stuck Drawer Cause**: Navigating changes route context pathnames, but does not reset state.
    * **Fix**: Added a `useEffect` pathname change listener to [Sidebar.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/Sidebar.tsx) that automatically collapses/closes the drawer whenever `window.innerWidth < 768` (mobile views) on route changes.

---

## Bug 7: Mobile Viewport Layout Scale and Zoom-Out Bug (Homepage CategoryTabs Overflow)

### 🔴 Symptoms
When navigating to the Homepage `/` on mobile screen sizes (like iPhone 14 Pro Max), the layout, fonts, and elements suddenly render extremely small (microscopic layout size). Navigating to other pages (Liked, History, Watch Later) renders with correct, responsive, and readable dimensions.

### 🔍 Root Cause & Fixes
1. **Root Cause**: The scrollable category tabs container (`CategoryTabs`) houses a long row of categories (`"All"`, `"Music"`, `"Gaming"`, etc.) with `whitespace-nowrap` flex elements. Because it did not specify a width constraint (`w-full` or `max-w-full`), mobile rendering engines (like WebKit/Safari on iOS) expanded the layout block width to 1200px and zoomed out the entire page so the overflow element fits in the viewport.
2. **Fixes**:
   * **Viewport Enforcement**: Added an explicit responsive viewport meta tag (`<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />`) using Next's `<Head>` component in [\_app.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/pages/_app.tsx) layout to lock browser scaling.
   * **Category Row Bounds**: Added `w-full max-w-full` class tags to [category-tabs.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/category-tabs.tsx) container.
   * **Homepage Container Bounds**: Wrapped the homepage layout in [index.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/pages/index.tsx) with a `w-full overflow-hidden` wrapper to clamp any potential content leaks.

---

## Feature 9: Channel Page Tabs Filtering

### 🟢 Requirement
Filter the user's video uploads on the channel detail page dynamically based on the clicked tab (Home, Videos, Shorts, Playlists, etc.), displaying regular uploads on "Videos" and only files under 60 seconds on "Shorts".

### 🔍 Solution & Interactions
1. **Lifting Tab Selection State**:
   * Updated [Channeltabs.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/Channeltabs.tsx) to accept `activeTab` and `setActiveTab` optional state hooks from the parent component, with local fallbacks.
2. **Tab Routing and Filtering Rules**:
   * **Home**: Shows all uploaded videos.
   * **Videos**: Filters regular uploads (duration is not set OR duration >= 60 seconds).
   * **Shorts**: Filters short uploads (duration is set AND duration < 60 seconds).
   * **Playlists**: Renders a placeholder box: `"This channel has no public playlists."`.
   * **Community**: Renders a placeholder box: `"Community posts are not available for this channel."`.
   * **About**: Renders a placeholder box showing the channel description or fallback text.
3. **Dynamic Headers**:
   * Updated [ChannelVideos.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/ChannelVideos.tsx) to support an optional `title` parameter that changes the grid header matching the tab selected (e.g. "Shorts", "Videos").

### 🛠️ Code Modified & Involved
*   **Files**: [index.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/pages/channel/%5Bid%5D/index.tsx), [Channeltabs.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/Channeltabs.tsx), [ChannelVideos.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/ChannelVideos.tsx)

---

## Feature 10: Like/Dislike, Watch Later & Subscribe Persistence

### 🟢 Requirement
Retrieve and restore the user's previous actions (Like, Dislike, Watch Later, and Subscribe) on page mount so that buttons remain highlighted and do not reset to gray upon refreshing the Watch page. Ensure this mechanism remains persistent when deployed to production.

### 🔍 Solution & Interactions
1. **Unified State Loader**:
   * Integrated a reactive `useEffect` block inside [VideoInfo.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/VideoInfo.tsx) that fires on mount and whenever the video or user context changes.
2. **Persistence Strategies (Production Compatible)**:
   * **Likes & Watch Later**: Queries the database directly using `axiosInstance.get(\`/like/\${user._id}\`)` and `axiosInstance.get(\`/watch/\${user._id}\`)` to check if the current video ID exists in the user's saved records. Restores the highlights (`isLiked`, `isWatchLater`) automatically.
   * **Dislikes**: Since the backend has no dislike collections, dislikes are saved directly in browser `localStorage` as an array of disliked video IDs. This state is restored on mount and increments/decrements a local visual counter.
   * **Subscriptions**: Since the backend has no subscription schemas, subscription state is tracked in browser `localStorage` under `subscribedChannels` as an array of subscribed channel names. This is restored on mount, turning the button into a gray `"Subscribed"` look or a red `"Subscribe"` look.
   * *Why it's deployment-ready*: Since `localStorage` runs entirely inside the user's browser, it functions seamlessly on any hosting environment (like Vercel/Render) without needing separate server config.

*   **File**: [VideoInfo.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/VideoInfo.tsx)
*   **Action**: Declared `isSubscribed` state, implemented mount-check `useEffect` hooks, updated `handleLike`, `handleDislike`, and `handleSubscribe` functions to sync with DB/localstorage, and updated the Subscribe button JSX layout.

---

## Feature 11: Video Upload Flow Improvements (Profile Auto-Fill & Visual Progress Bar)

### 🟢 Requirement
Secure uploader metadata against spoofing by auto-filling the channel details from the logged-in user profile, and display a highly visible, styled upload progress indicator.

### 🔍 Solution & Interactions
1. **Spoof-Proof Channel Details**:
   * Imported `useUser` context hook directly into [VideoUploader.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/VideoUploader.tsx).
   * Automatically auto-fills the request payload properties `videochanel` and `uploader` using `user.channelname` and `user._id` from the secure, authenticated context session, rather than trusting custom properties sent from page parameters.
2. **Visual Upload Progress Bar**:
   * Replaced the standard browser native progress element (which does not support custom styles) with a custom Tailwind CSS progress bar containing progress percentage readouts.
   * Leveraged a smooth CSS width transition class (`transition-all duration-300 ease-out`) that fills the visual track dynamically as Axios tracks chunks uploaded (`onUploadProgress`).

### 🛠️ Code Modified & Involved
*   **File**: [VideoUploader.tsx](file:///C:/Users/srima/Documents/Web%20DEV%20Docs/My%20YouTube/youtube/src/components/VideoUploader.tsx)
*   **Action**: Imported `useUser`, secured the upload parameters, and updated the progress tracker elements in the returned JSX block.



