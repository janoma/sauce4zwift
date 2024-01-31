<% if (obj.loading) { %>
    <tr><td><h2><i>Loading...</i></h2></td></tr>
<% } else if (results && results.length) { %>
    <thead>
        <tr>
            <th><!--place--></th>
            <th><!--flags--></th>
            <th>Name</th>
            <th>Team</th>
            <% if (sg.durationInSeconds) { %>
                <th class="distance">Distance</th>
            <% } else { %>
                <th class="time">Time</th>
            <% } %>
            <th>Power</th>
            <th>HR</th>
            <th>Weight</th>
        </tr>
    </thead>
    <tbody>
        <% let place = 0; %>
        <% let groupStart; %>
        <% for (const [i, x] of results.entries()) { %>
            <% const noPower = event.sport !== 'running' && x.sensorData.powerType === 'VIRTUAL_POWER'; %>
            <% const validResult = !noPower && !x.flaggedCheating && !x.flaggedSandbagging; %>
            <tr data-id="{{x.profileId}}"
                class="summary
                       {{x.profileId === selfAthlete.id ? 'self' : ''}}
                       {{x.flaggedCheating ? 'cheating' : ''}}
                       {{x.flaggedSandbagging ? 'sandbagging' : ''}}
                       {{noPower ? 'nopower' : ''}}
                       {{!validResult ? 'invalid' : ''}}
                ">
                <% place += validResult ? 1 : 0; %>
                <td class="place">
                    <% if (validResult) { %>
                        <% if (place === 1) { %>
                            <ms class="trophy gold">trophy</ms>
                        <% } else if (place === 2) { %>
                            <ms class="trophy silver">trophy</ms>
                        <% } else if (place === 3) { %>
                            <ms class="trophy bronze">trophy</ms>
                        <% } else { %>
                            {-humanPlace(place, {suffix: true, html: true})-}
                        <% } %>
                    <% } else { %>
                        -
                    <% } %>
                </td>
                <td class="icons">
                    <% if (x.flaggedCheating) { %>
                        <ms title="Flagged for cheating" class="flag">warning</ms>
                    <% } if (x.flaggedSandbagging) { %>
                        <ms title="Flagged for sandbagging" class="flag">emergency_heat</ms>
                    <% } if (noPower) { %>
                        <ms title="No power device" class="flag">power_off</ms>
                    <% } if (x.lateJoin) { %>
                        <ms title="Joined late" class="warning">acute</ms>
                    <% } %>
                </td>
                <td class="name">
                    {-fmtFlag(x.athlete.countryCode, {empty: ''})-}
                    <% if (x.athlete.gender === 'female') { %>
                        <ms class="female" title="Is female">female</ms>
                    <% } %>
                    {{x.athlete.sanitizedFullname}}
                </td>
                <td class="team"><% if (x.athlete.team) { %>{-teamBadge(x.athlete.team)-}<% } %></td>
                <% if (sg.durationInSeconds) { %>
                    <td class="distance">{-humanDistance(x.activityData.segmentDistanceInCentimeters / 100, {html: true, suffix: true})-}</td>
                <% } else {  %>
                    <% const t = x.activityData.durationInMilliseconds / 1000; %>
                    <% const prevT = i ? results[i - 1].activityData.durationInMilliseconds / 1000 : null; %>
                    <% if (prevT && t - prevT < 2) { %>
                        <td class="time relative" title="{-humanTimer(t, {ms: true})-}">
                            +{-humanTimer(t - groupStart, {ms: true})-}
                        </td>
                    <% } else { %>
                        <td class="time">{-humanTimer(t, {html: true, ms: true})-}</td>
                        <% groupStart = t; %>
                    <% }  %>
                <% } %>
                <td class="power">{-humanPower(x.sensorData.avgWatts, {suffix: true, html: true})-}</td>
                <td class="hr">{-humanNumber(x.sensorData.heartRateData?.avgHeartRate, {suffix: 'bpm', html: true})-}</td>
                <td class="weight">{-humanWeightClass(x.profileData.weightInGrams / 1000, {suffix: true, html: true})-}</td>
            </tr>
            <tr class="details"><td colspan="8"></td></tr>
        <% } %>
    </tbody>
<% } else { %>
    <thead>
        <tr>
            <th class="icon"></th>
            <th class="icon"></th>
            <th class="icon"></th>
            <th class="icon"></th>
            <th class="icon"></th>
            <th class="name">Name</th>
            <th class="team">Team</th>
            <th class="ftp">FTP</th>
            <th class="weight">Weight</th>
        </tr>
    </thead>
    <tbody>
        <% for (const {id, athlete, likelyInGame} of entrants) { %>
            <tr data-id="{{id}}" class="summary {{id === selfAthlete.id ? 'self' : ''}}">
                <td class="icon"><% if (athlete.marked) { %>
                    <ms class="marked" title="Is marked">bookmark_added</ms>
                <% } %></td>
                <td class="icon"><% if (athlete.following) { %>
                    <ms class="following" title="You are following">follow_the_signs</ms>
                <% } %></td>
                <td class="icon"><% if (likelyInGame) { %>
                    <ms title="Likely in game" class="in-game">check_circle</ms>
                <% } %></td>
                <td class="icon"><% if (athlete.powerMeter) { %>
                    <% if (athlete.powerSourceModel === 'Smart Trainer') { %>
                        <ms class="power" title="Has smart trainer">offline_bolt</ms>
                    <% } else { %>
                        <ms class="power" title="Has power meter">bolt</ms>
                    <% } %>
                <% } %></td>
                <td class="icon"><% if (athlete.gender === 'female') { %>
                    <ms class="female" title="Is female">female</ms>
                <% } %></td>
                <td class="name">{-fmtFlag(athlete.countryCode, {empty: ''})-} {{athlete.sanitizedFullname}}</td>
                <td class="team"><% if (athlete.team) { %>{-teamBadge(athlete.team)-}<% } %></td>
                <td class="power">{-humanPower(athlete.ftp, {suffix: true, html: true})-}</td>
                <td class="weight">{-humanWeightClass(athlete.weight, {suffix: true, html: true})-}</td>
            </tr>
            <tr class="details"><td colspan="9"></td></tr>
        <% } %>
    </tbody>
<% } %>
