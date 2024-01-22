<div class="profile">
    <% if (!athlete) { %>
        <header class="title">
            <div class="name">
                Athlete not found: {{athleteId}}
            </div>
            <div class="buttons">
                <% if (!obj.embedded) { %>
                    <a href title="Close this window" data-action="close" class="electron-only"><ms>close</ms></a>
                <% } %>
            </div>
        </header>
    <% } else { %>
        <header class="title">
            <div class="name">
                <% if (athlete.type !== 'NORMAL') { %>
                    <span class="special-badge">({{athlete.type.replace(/_/, ' ')}})</span>
                <% } %>
                <% if (athlete.countryCode) { %>
                    <img class="flag" src="{{flags[athlete.countryCode]}}"
                         title="{{nations[athlete.countryCode]}}"/>
                <% } %>
                {{athlete.sanitizedFullname}}
            </div>
            <div class="buttons">
                <a title="Open Grid Window focused on this athlete"
                   href="/pages/watching.html?windowId=watching-link-popup&windowType=watching&id={{athlete.id}}"
                   target="watching_popup_{{athlete.id}}" class="enabled-in-game-only" disabled><ms>grid_view</ms></a>
                <a title="Analysis view of this athletes session"
                   href="/pages/analysis.html?windowType=analysis&id={{athlete.id}}"
                   target="analysis_popup_{{athlete.id}}" class="enabled-in-game-only" disabled><ms>monitoring</ms></a>
                <a title="Watch this athlete (Game Connection is required)"
                   data-action="watch" {{!gameConnection ? 'disabled' : ''}} href><ms>video_camera_front</ms></a>
                <a title="Toggle visibility of chat messages from this person"
                   data-action="toggleMuted" class="{{athlete.muted ? 'active' : ''}}"
                   href><ms>comments_disabled</ms></a>
                <a title="Give a Ride On to this athlete" {{obj.rideonSent ? 'disabled' : 'href'}}
                   data-action="rideon"><ms>thumb_up</ms></a>
                <% if (athlete.following) { %>
                    <a title="You are following this athlete, click to unfollow" href class="active"
                       data-action="unfollow"><ms>follow_the_signs</ms></a>
                <% } else if (athlete.followRequest) { %>
                    <a title="Follow request sent" disabled class=""><ms>pending</ms></a>
                <% } else { %>
                    <a title="You are not following this athlete, click to follow" href
                       data-action="follow"><ms>follow_the_signs</ms></a>
                <% } %>
                <a title="Toggle marked state for this person.  Marked athletes will receieve extra attention and allow quick filtering.  Recommended for friends or foes in race situations."
                   data-action="toggleMarked" class="{{athlete.marked ? 'active' : ''}}"
                   href><ms>{{athlete.marked ? 'bookmark_added' : 'bookmark_add'}}</ms></a>
                <% if (!obj.embedded) { %>
                    <a href title="Close this window" data-action="close" class="electron-only"><ms>close</ms></a>
                <% } %>
            </div>
        </header>
        <section>
            <% if (athlete.avatar) { %>
                <a class="avatar" href="profile-avatar.html?id={{athlete.id}}" target="profile-avatar">
                    <img src="{{athlete.avatar}}"/>
                </a>
            <% } else { %>
                <a class="avatar"><img src="images/blankavatar.png"/></a>
            <% } %>
            <div class="info">
                <% if (athlete.team) { %>
                    <div class="row p2"><key>Team</key>{-common.teamBadge(athlete.team)-}</div>
                <% } %>
                <% if (athlete.level) { %>
                    <div class="row p2"><key>Level</key>{{athlete.level}}</div>
                <% } %>
                <% if (athlete.age) { %>
                    <div class="row p2"><key>Age</key>{{athlete.age}}</div>
                <% } %>
                <% if (athlete.weight) { %>
                    <div class="row p2"><key>Weight</key>{-humanWeightClass(athlete.weight, {suffix: true, html: true})-}</div>
                <% } %>
                <% if (athlete.height) { %>
                    <div class="row p2"><key>Height</key>{-humanHeight(athlete.height, {html: true, suffix: true})-}</div>
                <% } %>
                <!--<div class="row p2"><key>Threshold HR</key>{{athlete.hrzones}}<a href data-id="hr-edit"><ms>settings</ms></a></div>
                <div class="row p2">
                    <sauce-row-editor>
                        <header>
                            <div>Heart Rate Zones</div>
                            <a add><ms>add_circle</ms></a>
                        </header>
                        <row>
                            <column>Z1</column>
                            <column>
                                <input type="number" name="from" value="1"/> 🠚
                                <input type="number" name="to" value="100"/>
                            </column>
                            <column><a remove><ms>delete</ms></a></column>
                        </row>
                        <row>
                            <column>Z2</column>
                            <column>
                                <input type="number" name="from" value="1"/> 🠚
                                <input type="number" name="to" value="100"/>
                            </column>
                            <column><a remove><ms>delete</ms></a></column>
                        </row>
                    </sauce-row-editor>
                </div>-->
                <div class="row p2"><key>FTP</key>{-humanPower(athlete.ftp, {suffix: true, html: true})-}</div>
                <div class="row p2" title="CP is Critical Power (often similiar to FTP) and W' (pronounced &quot;W Prime&quot;) is a the amount of energy (kJ) available when working harder than the CP value.  Think of it as a battery level." >
                    <key>CP</key><a title="Click to edit - Press Enter to save"
                        href="javascript:void(0)" data-key="cp" data-type="number"
                        class="inline-edit cp">{-humanPower(athlete.cp || athlete.ftp, {suffix: true, html: true})-}</a>,
                    W': <a title="Click to edit - Press Enter to save"
                        href="javascript:void(0)" data-key="wPrime" data-type="number" data-conv-factor="1000"
                        class="inline-edit wprime">{-humanNumber(athlete.wPrime / 1000, {suffix: 'kJ', html: true, precision: 1})-}</a>
                </div>
                <div class="row p2">
                    <key>ID</key><a href="https://zwiftpower.com/profile.php?z={{athleteId}}"
                                    title="Open ZwiftPower profile" target="_blank"
                                    external>{{athleteId}} <img class="inline-size" src="images/zp_logo.png"/></a>
                </div>
            </div>
            <div class="info live">
                <div class="row p2"><key>World</key><span class="live" data-id="world">-</span></div>
                <div class="row p2"><key>Power</key><span class="live" data-id="power">-</span></div>
                <div class="row p2"><key>Speed</key><span class="live" data-id="speed">-</span></div>
                <div class="row p2"><key>HR</key><span class="live" data-id="hr">-</span><abbr class="unit">bpm</abbr></div>
                <div class="row p2"><key>Ride Ons</key><span class="live" data-id="rideons">-</span></div>
                <div class="row p2"><key>Energy</key><span class="live" data-id="kj">-</span><abbr class="unit">kJ</abbr></div>
            </div>
        </section>
    <% } %>
    <% if (obj.debug) { %>
        <section><pre class="debug"></pre></section>
    <% } %>
</div>
