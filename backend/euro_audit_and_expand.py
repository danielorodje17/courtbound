"""
CourtBound — Euro Friendly audit + D2/NAIA/JUCO expansion.
Run: python3 euro_audit_and_expand.py
"""
import asyncio, os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME   = os.environ.get("DB_NAME")

img_bball  = "https://images.unsplash.com/photo-1546519638405-a2f83d0f1b7c?w=400"
img_court  = "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400"
img_stadium= "https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=400"

# ─────────────────────────────────────────────────────────────────
# PART 1 — Remove Euro Friendly badge (set foreign_friendly = False)
# Criteria: small rural school, no international infrastructure,
#           HBCU, or no track record of European recruitment.
# ─────────────────────────────────────────────────────────────────
REMOVE_EURO_FRIENDLY = [
    # Division I
    "Southern University",            # HBCU — primarily serves African-American community

    # Division II — rural/tiny/isolated/religious
    "Lincoln Memorial University",    # Harrogate TN — population 3,000, very remote
    "University of West Alabama",     # Livingston AL — tiny rural
    "Harding University",             # Searcy AR — conservative religious, small town
    "Ferris State University",        # Big Rapids MI — small town, trade/engineering focus
    "Michigan Technological University",  # Houghton MI — very remote Upper Peninsula
    "Northern Michigan University",   # Marquette MI — remote Upper Peninsula
    "Nebraska-Kearney",               # Kearney NE — small Nebraska town
    "American International College", # Springfield MA — small, declining program
    "Tiffin University",              # Tiffin OH — tiny (~1,100 students)
    "Delta State University",         # Cleveland MS — very rural
    "Southwest Baptist University",   # Bolivar MO — small religious
    "Southern Arkansas University",   # Magnolia AR — tiny rural
    "Henderson State University",     # Arkadelphia AR — small rural
    "Ouachita Baptist University",    # Arkadelphia AR — small religious

    # NAIA — rural/tiny/limited international infrastructure
    "Carroll College",                # Helena MT — small, remote mountain school
    "Eastern Oregon University",      # La Grande OR — very rural eastern Oregon
    "Montana Tech University",        # Butte MT — remote, engineering/mining focus
    "Rocky Mountain College",         # Billings MT — small Montana school
    "Valley City State University",   # Valley City ND — tiny (~1,400 students)
    "Jamestown University",           # Jamestown ND — small rural ND
    "Baker University",               # Baldwin City KS — very small rural KS
    "Hastings College",               # Hastings NE — small Nebraska town
    "William Penn University",        # Oskaloosa IA — tiny rural Iowa
    "Northwestern College (Iowa)",    # Orange City IA — very small Dutch-Reformed
    "Dordt University",               # Sioux Center IA — tiny Dutch-Reformed college
    "Spring Arbor University",        # Spring Arbor MI — small rural MI
    "Southwestern Assemblies of God University",  # Waxahachie TX — small religious

    # JUCO — tiny rural campuses, limited housing / international support
    "Carl Albert State College",      # Poteau OK — very small rural
    "Connors State College",          # Warner OK — tiny rural (<1,000 students)
    "Eastern Oklahoma State College", # Wilburton OK — tiny rural
    "Northeastern Oklahoma A&M College",  # Miami OK — small rural
    "Northern Oklahoma College",      # Tonkawa OK — tiny (<2,000 students)
    "Wabash Valley College",          # Mount Carmel IL — tiny rural
]

# ─────────────────────────────────────────────────────────────────
# PART 2 — New colleges to add
# ─────────────────────────────────────────────────────────────────
NEW_COLLEGES = [
    # ── DIVISION II ─────────────────────────────────────────────
    {"name":"Angelo State University","location":"San Angelo, TX","state":"Texas","region":"USA","country":"USA","division":"Division II","conference":"Lone Star","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full DII scholarship. Lone Star Conference — competitive Texas basketball. ASU is part of Texas Tech system.","acceptance_rate":"80%","notable_alumni":"Various Lone Star standouts","ranking":None,"website":"https://gosaxons.com","image_url":img_bball,"coaches":[{"name":"Banky Fulton","title":"Head Coach","email":"athletics@angelo.edu","phone":"+1-325-942-2264"}]},

    {"name":"Lubbock Christian University","location":"Lubbock, TX","state":"Texas","region":"USA","country":"USA","division":"Division II","conference":"Lone Star","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full DII scholarship. Lone Star Conference. Christian environment. Large international student body.","acceptance_rate":"45%","notable_alumni":"Various Lone Star standouts","ranking":None,"website":"https://lcuchaparros.com","image_url":img_court,"coaches":[{"name":"Todd Duncan","title":"Head Coach","email":"athletics@lcu.edu","phone":"+1-806-720-7221"}]},

    {"name":"Texas A&M International University","location":"Laredo, TX","state":"Texas","region":"USA","country":"USA","division":"Division II","conference":"Lone Star","foreign_friendly":True,"scholarship_type":"Full Athletic","scholarship_info":"Full DII scholarship. Border city — extremely diverse and international. Spanish-English bilingual campus.","acceptance_rate":"72%","notable_alumni":"Various Lone Star standouts","ranking":None,"website":"https://tamiu.edu/athletics","image_url":img_bball,"coaches":[{"name":"Jorge Ramos","title":"Head Coach","email":"athletics@tamiu.edu","phone":"+1-956-326-2240"}]},

    {"name":"Emporia State University","location":"Emporia, KS","state":"Kansas","region":"USA","country":"USA","division":"Division II","conference":"MIAA","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full DII scholarship. MIAA — one of the toughest D2 conferences. Strong academic reputation.","acceptance_rate":"93%","notable_alumni":"Various MIAA standouts","ranking":None,"website":"https://esuhornets.com","image_url":img_court,"coaches":[{"name":"Aaron Senne","title":"Head Coach","email":"athletics@emporia.edu","phone":"+1-620-341-5781"}]},

    {"name":"Newman University","location":"Wichita, KS","state":"Kansas","region":"USA","country":"USA","division":"Division II","conference":"MIAA","foreign_friendly":True,"scholarship_type":"Full Athletic","scholarship_info":"Full DII scholarship. MIAA. Wichita — good-sized city. Newman has strong tradition of international student recruitment.","acceptance_rate":"54%","notable_alumni":"Various MIAA standouts","ranking":None,"website":"https://newmanjets.com","image_url":img_bball,"coaches":[{"name":"Terry Henson","title":"Head Coach","email":"athletics@newmanu.edu","phone":"+1-316-942-4291"}]},

    {"name":"Colorado Mesa University","location":"Grand Junction, CO","state":"Colorado","region":"USA","country":"USA","division":"Division II","conference":"RMAC","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full DII scholarship. Rocky Mountain Athletic Conference. Western Colorado outdoors lifestyle.","acceptance_rate":"76%","notable_alumni":"Various RMAC standouts","ranking":None,"website":"https://gomavericks.com","image_url":img_court,"coaches":[{"name":"Brandon Moore","title":"Head Coach","email":"athletics@coloradomesa.edu","phone":"+1-970-248-1670"}]},

    {"name":"Fort Lewis College","location":"Durango, CO","state":"Colorado","region":"USA","country":"USA","division":"Division II","conference":"RMAC","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"DII scholarship. RMAC. Durango — unique mountain city setting. Strong Native American heritage and diverse community.","acceptance_rate":"84%","notable_alumni":"Various RMAC standouts","ranking":None,"website":"https://fortlewisskyliners.com","image_url":img_bball,"coaches":[{"name":"Jeff Cox","title":"Head Coach","email":"athletics@fortlewis.edu","phone":"+1-970-247-7552"}]},

    {"name":"Bemidji State University","location":"Bemidji, MN","state":"Minnesota","region":"USA","country":"USA","division":"Division II","conference":"NSIC","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full DII scholarship. NSIC. North central Minnesota. Strong outdoor/winter sports culture.","acceptance_rate":"72%","notable_alumni":"Various NSIC standouts","ranking":None,"website":"https://bsubeavers.com","image_url":img_court,"coaches":[{"name":"Brandon Rooks","title":"Head Coach","email":"athletics@bemidjistate.edu","phone":"+1-218-755-3862"}]},

    {"name":"Wayne State University (Nebraska)","location":"Wayne, NE","state":"Nebraska","region":"USA","country":"USA","division":"Division II","conference":"NSIC","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full DII scholarship. NSIC North. Nebraska small-town values, strong academic support.","acceptance_rate":"99%","notable_alumni":"Various NSIC standouts","ranking":None,"website":"https://wscwildcats.com","image_url":img_bball,"coaches":[{"name":"Greg Dowd","title":"Head Coach","email":"athletics@wsc.edu","phone":"+1-402-375-7520"}]},

    {"name":"Upper Iowa University","location":"Fayette, IA","state":"Iowa","region":"USA","country":"USA","division":"Division II","conference":"NSIC","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full DII scholarship. NSIC. Iowa liberal arts tradition. Small-town campus, big-time competition.","acceptance_rate":"72%","notable_alumni":"Various NSIC standouts","ranking":None,"website":"https://uiuathletics.com","image_url":img_court,"coaches":[{"name":"Ken Baier","title":"Head Coach","email":"athletics@uiu.edu","phone":"+1-563-425-5200"}]},

    {"name":"Palm Beach Atlantic University","location":"West Palm Beach, FL","state":"Florida","region":"USA","country":"USA","division":"Division II","conference":"Sunshine State","foreign_friendly":True,"scholarship_type":"Full Athletic","scholarship_info":"Full DII scholarship. Sunshine State Conference. South Florida — highly international, warm year-round.","acceptance_rate":"65%","notable_alumni":"Various SSC standouts","ranking":None,"website":"https://pbabuccaneers.com","image_url":img_bball,"coaches":[{"name":"Mark Slessinger","title":"Head Coach","email":"athletics@pba.edu","phone":"+1-561-803-2175"}]},

    {"name":"St. Thomas University (FL)","location":"Miami Gardens, FL","state":"Florida","region":"USA","country":"USA","division":"Division II","conference":"Sunshine State","foreign_friendly":True,"scholarship_type":"Full Athletic","scholarship_info":"Full DII scholarship. Miami area — most international city in the US. Strong Latin American and Caribbean connections.","acceptance_rate":"42%","notable_alumni":"Various SSC standouts","ranking":None,"website":"https://stustbobcats.com","image_url":img_court,"coaches":[{"name":"Marcelino Serna","title":"Head Coach","email":"athletics@stu.edu","phone":"+1-305-628-6752"}]},

    {"name":"Florida Memorial University","location":"Miami Gardens, FL","state":"Florida","region":"USA","country":"USA","division":"Division II","conference":"Sunshine State","foreign_friendly":True,"scholarship_type":"Full Athletic","scholarship_info":"Full scholarship. Miami's HBCU. Extremely diverse, international city. Caribbean and African connections.","acceptance_rate":"72%","notable_alumni":"Various SSC standouts","ranking":None,"website":"https://fmulions.com","image_url":img_bball,"coaches":[{"name":"Brandon Ponder","title":"Head Coach","email":"athletics@fmuniv.edu","phone":"+1-305-626-3600"}]},

    {"name":"Flagler College","location":"St. Augustine, FL","state":"Florida","region":"USA","country":"USA","division":"Division II","conference":"Peach Belt","foreign_friendly":True,"scholarship_type":"Partial Athletic","scholarship_info":"DII scholarship in beautiful historic St. Augustine FL. Peach Belt Conference. Warm Florida climate.","acceptance_rate":"48%","notable_alumni":"Various PBC standouts","ranking":None,"website":"https://athletics.flagler.edu","image_url":img_court,"coaches":[{"name":"Gregg Gibson","title":"Head Coach","email":"athletics@flagler.edu","phone":"+1-904-829-6481"}]},

    {"name":"Coker University","location":"Hartsville, SC","state":"South Carolina","region":"USA","country":"USA","division":"Division II","conference":"South Atlantic","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full DII scholarship. South Atlantic Conference. Growing programme in South Carolina.","acceptance_rate":"64%","notable_alumni":"Various SAC standouts","ranking":None,"website":"https://coker.edu/athletics","image_url":img_bball,"coaches":[{"name":"Travis Whitley","title":"Head Coach","email":"athletics@coker.edu","phone":"+1-843-383-8015"}]},

    {"name":"Tusculum University","location":"Greeneville, TN","state":"Tennessee","region":"USA","country":"USA","division":"Division II","conference":"South Atlantic","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full DII scholarship. SAC. Historic institution in east Tennessee. Strong basketball tradition.","acceptance_rate":"60%","notable_alumni":"Various SAC standouts","ranking":None,"website":"https://goPioneers.com","image_url":img_court,"coaches":[{"name":"Travis Dillard","title":"Head Coach","email":"athletics@tusculum.edu","phone":"+1-423-636-7300"}]},

    {"name":"Fairmont State University","location":"Fairmont, WV","state":"West Virginia","region":"USA","country":"USA","division":"Division II","conference":"Mountain East","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full DII scholarship. Mountain East Conference. West Virginia regional talent pipeline.","acceptance_rate":"100%","notable_alumni":"Various MEC standouts","ranking":None,"website":"https://fairmontstatefighting.com","image_url":img_bball,"coaches":[{"name":"DeAndre Aikens","title":"Head Coach","email":"athletics@fairmontstate.edu","phone":"+1-304-367-4290"}]},

    {"name":"West Virginia Wesleyan College","location":"Buckhannon, WV","state":"West Virginia","region":"USA","country":"USA","division":"Division II","conference":"Mountain East","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"DII scholarship. Mountain East. Liberal arts tradition. Small-town WV community.","acceptance_rate":"68%","notable_alumni":"Various MEC standouts","ranking":None,"website":"https://wvwcbobcats.com","image_url":img_court,"coaches":[{"name":"Josh Runner","title":"Head Coach","email":"athletics@wvwc.edu","phone":"+1-304-473-8000"}]},

    # ── NAIA ─────────────────────────────────────────────────────
    {"name":"Oklahoma Wesleyan University","location":"Bartlesville, OK","state":"Oklahoma","region":"USA","country":"USA","division":"NAIA","conference":"Kansas Collegiate Athletic Conference (KCAC)","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full NAIA scholarship. KCAC powerhouse. Faith-based. Known for multiple NAIA tournament appearances.","acceptance_rate":"32%","notable_alumni":"Various KCAC standouts","ranking":None,"website":"https://okwu.edu/athletics","image_url":img_bball,"coaches":[{"name":"Donnie Bostwick","title":"Head Coach","email":"athletics@okwu.edu","phone":"+1-918-335-6219"}]},

    {"name":"MidAmerica Nazarene University","location":"Olathe, KS","state":"Kansas","region":"USA","country":"USA","division":"NAIA","conference":"Kansas Collegiate Athletic Conference (KCAC)","foreign_friendly":True,"scholarship_type":"Full Athletic","scholarship_info":"Full scholarship. KCAC. Olathe KS — suburb of Kansas City, metro access. International student support programme.","acceptance_rate":"54%","notable_alumni":"Various KCAC standouts","ranking":None,"website":"https://munats.com","image_url":img_court,"coaches":[{"name":"Jeff Sparks","title":"Head Coach","email":"athletics@mnu.edu","phone":"+1-913-971-3710"}]},

    {"name":"Tabor College","location":"Hillsboro, KS","state":"Kansas","region":"USA","country":"USA","division":"NAIA","conference":"Kansas Collegiate Athletic Conference (KCAC)","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full NAIA scholarship. KCAC conference. Mennonite heritage. Small Kansas community.","acceptance_rate":"41%","notable_alumni":"Various KCAC standouts","ranking":None,"website":"https://tabor.edu/athletics","image_url":img_bball,"coaches":[{"name":"Ryan Showles","title":"Head Coach","email":"athletics@tabor.edu","phone":"+1-620-947-3121"}]},

    {"name":"Bethel University (Tennessee)","location":"McKenzie, TN","state":"Tennessee","region":"USA","country":"USA","division":"NAIA","conference":"Tennessee Athletic Conference (TAC)","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full scholarship. TAC. West Tennessee campus. Known for strong basketball tradition in NAIA.","acceptance_rate":"64%","notable_alumni":"Various TAC standouts","ranking":None,"website":"https://bethelwildcats.com","image_url":img_court,"coaches":[{"name":"Chris Severs","title":"Head Coach","email":"athletics@bethelu.edu","phone":"+1-731-352-4000"}]},

    {"name":"Cumberland University","location":"Lebanon, TN","state":"Tennessee","region":"USA","country":"USA","division":"NAIA","conference":"Mid-South Conference","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full NAIA scholarship. Midsouth Conference. Near Nashville — music and culture hub.","acceptance_rate":"57%","notable_alumni":"Various Midsouth standouts","ranking":None,"website":"https://cuphoenix.com","image_url":img_bball,"coaches":[{"name":"Paul Burgess","title":"Head Coach","email":"athletics@cumberland.edu","phone":"+1-615-547-1386"}]},

    {"name":"Campbellsville University","location":"Campbellsville, KY","state":"Kentucky","region":"USA","country":"USA","division":"NAIA","conference":"Mid-South Conference","foreign_friendly":True,"scholarship_type":"Full Athletic","scholarship_info":"Full scholarship. Midsouth Conference. Kentucky basketball country. International student support programme.","acceptance_rate":"72%","notable_alumni":"Various Midsouth standouts","ranking":None,"website":"https://campbellsville.edu/athletics","image_url":img_court,"coaches":[{"name":"Braden Sizemore","title":"Head Coach","email":"athletics@campbellsville.edu","phone":"+1-270-789-5000"}]},

    {"name":"Freed-Hardeman University","location":"Henderson, TN","state":"Tennessee","region":"USA","country":"USA","division":"NAIA","conference":"Mid-South Conference","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full scholarship. Midsouth. Church of Christ affiliated. West Tennessee campus.","acceptance_rate":"60%","notable_alumni":"Various Midsouth standouts","ranking":None,"website":"https://fhulions.com","image_url":img_bball,"coaches":[{"name":"Kyle Thompson","title":"Head Coach","email":"athletics@fhu.edu","phone":"+1-731-989-6000"}]},

    {"name":"William Carey University","location":"Hattiesburg, MS","state":"Mississippi","region":"USA","country":"USA","division":"NAIA","conference":"Southern States Athletic Conference (SSAC)","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full NAIA scholarship. SSAC. Southern Mississippi. Baptist affiliated with welcoming international programme.","acceptance_rate":"48%","notable_alumni":"Various SSAC standouts","ranking":None,"website":"https://wcucrusaders.com","image_url":img_court,"coaches":[{"name":"Terry Beard","title":"Head Coach","email":"athletics@wmcarey.edu","phone":"+1-601-318-6000"}]},

    {"name":"Indiana Tech","location":"Fort Wayne, IN","state":"Indiana","region":"USA","country":"USA","division":"NAIA","conference":"Wolverine-Hoosier Athletic Conference (WHAC)","foreign_friendly":True,"scholarship_type":"Full Athletic","scholarship_info":"Full scholarship. WHAC. Fort Wayne Indiana — international-friendly college town. Strong engineering/tech programmes alongside athletics.","acceptance_rate":"62%","notable_alumni":"Various WHAC standouts","ranking":None,"website":"https://indianatech.edu/athletics","image_url":img_bball,"coaches":[{"name":"Luke Fischer","title":"Head Coach","email":"athletics@indianatech.edu","phone":"+1-260-422-5561"}]},

    {"name":"Cornerstone University","location":"Grand Rapids, MI","state":"Michigan","region":"USA","country":"USA","division":"NAIA","conference":"Wolverine-Hoosier Athletic Conference (WHAC)","foreign_friendly":True,"scholarship_type":"Full Athletic","scholarship_info":"Full scholarship. WHAC. Grand Rapids MI — Michigan's second city. Diverse community, international students well-supported.","acceptance_rate":"65%","notable_alumni":"Various WHAC standouts","ranking":None,"website":"https://cornerstonegolden.com","image_url":img_court,"coaches":[{"name":"Kyle Rohm","title":"Head Coach","email":"athletics@cornerstone.edu","phone":"+1-616-222-1500"}]},

    {"name":"Grace College","location":"Winona Lake, IN","state":"Indiana","region":"USA","country":"USA","division":"NAIA","conference":"Crossroads League","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full NAIA scholarship. Crossroads League — strong conference. Indiana basketball heartland.","acceptance_rate":"67%","notable_alumni":"Various Crossroads standouts","ranking":None,"website":"https://gracelancers.com","image_url":img_bball,"coaches":[{"name":"Chad Briscoe","title":"Head Coach","email":"athletics@grace.edu","phone":"+1-574-372-5100"}]},

    {"name":"Huntington University","location":"Huntington, IN","state":"Indiana","region":"USA","country":"USA","division":"NAIA","conference":"Crossroads League","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full scholarship. Crossroads League. Small Indiana college with strong athletics tradition.","acceptance_rate":"73%","notable_alumni":"Various Crossroads standouts","ranking":None,"website":"https://hu.edu/athletics","image_url":img_court,"coaches":[{"name":"Bryan Burns","title":"Head Coach","email":"athletics@huntington.edu","phone":"+1-260-356-6000"}]},

    {"name":"Georgetown College","location":"Georgetown, KY","state":"Kentucky","region":"USA","country":"USA","division":"NAIA","conference":"Mid-South Conference","foreign_friendly":True,"scholarship_type":"Full Athletic","scholarship_info":"Full scholarship. Midsouth. Near Lexington KY — basketball-mad state. International student scholarship available.","acceptance_rate":"68%","notable_alumni":"Various Midsouth standouts","ranking":None,"website":"https://georgetowntigers.com","image_url":img_bball,"coaches":[{"name":"Todd Morgan","title":"Head Coach","email":"athletics@georgetowncollege.edu","phone":"+1-502-863-8000"}]},

    {"name":"Union University","location":"Jackson, TN","state":"Tennessee","region":"USA","country":"USA","division":"NAIA","conference":"Mid-South Conference","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full NAIA scholarship. Midsouth. Christian liberal arts. West Tennessee location.","acceptance_rate":"57%","notable_alumni":"Various Midsouth standouts","ranking":None,"website":"https://uubulldogs.com","image_url":img_court,"coaches":[{"name":"Ryun Williams","title":"Head Coach","email":"athletics@uu.edu","phone":"+1-731-661-5100"}]},

    {"name":"Rio Grande University","location":"Rio Grande, OH","state":"Ohio","region":"USA","country":"USA","division":"NAIA","conference":"River States Conference (RSC)","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full NAIA scholarship. River States Conference. Ohio rural campus. Affordable, small community.","acceptance_rate":"100%","notable_alumni":"Various RSC standouts","ranking":None,"website":"https://rguredstorm.com","image_url":img_bball,"coaches":[{"name":"Evan Lawson","title":"Head Coach","email":"athletics@rio.edu","phone":"+1-740-245-7229"}]},

    {"name":"Shorter University","location":"Rome, GA","state":"Georgia","region":"USA","country":"USA","division":"NAIA","conference":"Southern States Athletic Conference (SSAC)","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full scholarship. SSAC. Northwest Georgia near Atlanta. Growing programme with D1 aspirations.","acceptance_rate":"54%","notable_alumni":"Various SSAC standouts","ranking":None,"website":"https://shorter.edu/athletics","image_url":img_court,"coaches":[{"name":"Brody Mitchell","title":"Head Coach","email":"athletics@shorter.edu","phone":"+1-706-233-7200"}]},

    {"name":"Bryan College","location":"Dayton, TN","state":"Tennessee","region":"USA","country":"USA","division":"NAIA","conference":"Appalachian Athletic Conference (AAC)","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full NAIA scholarship. Appalachian Athletic Conference. Small Christian college in Tennessee.","acceptance_rate":"57%","notable_alumni":"Various AAC standouts","ranking":None,"website":"https://bryanlions.com","image_url":img_bball,"coaches":[{"name":"Lance Witt","title":"Head Coach","email":"athletics@bryan.edu","phone":"+1-423-775-2041"}]},

    # ── JUCO ─────────────────────────────────────────────────────
    {"name":"Pratt Community College","location":"Pratt, KS","state":"Kansas","region":"USA","country":"USA","division":"JUCO","conference":"KJCCC","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full JUCO scholarship. Kansas JUCO conference. Strong pathway to D1/D2 in Kansas region.","acceptance_rate":"100%","notable_alumni":"Various D1 transfers","ranking":None,"website":"https://prattcc.edu","image_url":img_bball,"coaches":[{"name":"Austin Bauer","title":"Head Coach","email":"athletics@prattcc.edu","phone":"+1-620-672-5641"}]},

    {"name":"Cloud County Community College","location":"Concordia, KS","state":"Kansas","region":"USA","country":"USA","division":"JUCO","conference":"KJCCC","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full scholarship. KJCCC. Kansas JUCO powerhouse known for international player recruitment.","acceptance_rate":"100%","notable_alumni":"Various D1 transfers","ranking":None,"website":"https://cloudcounty.edu","image_url":img_court,"coaches":[{"name":"Braden Reeser","title":"Head Coach","email":"athletics@cloudcounty.edu","phone":"+1-785-243-1435"}]},

    {"name":"Cowley County Community College","location":"Arkansas City, KS","state":"Kansas","region":"USA","country":"USA","division":"JUCO","conference":"KJCCC","foreign_friendly":True,"scholarship_type":"Full Athletic","scholarship_info":"Full scholarship. KJCCC. Cowley College has strong history of international player recruitment — European guards have featured prominently.","acceptance_rate":"100%","notable_alumni":"Various D1 transfers","ranking":None,"website":"https://cowley.edu","image_url":img_bball,"coaches":[{"name":"Chris Martin","title":"Head Coach","email":"athletics@cowley.edu","phone":"+1-620-442-0430"}]},

    {"name":"Frank Phillips College","location":"Borger, TX","state":"Texas","region":"USA","country":"USA","division":"JUCO","conference":"WJCAC","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full JUCO scholarship. WJCAC. West Texas JUCO. Good pipeline to Texas D1/D2 schools.","acceptance_rate":"100%","notable_alumni":"Various WJCAC standouts","ranking":None,"website":"https://fpctexans.com","image_url":img_court,"coaches":[{"name":"Kyle Bridges","title":"Head Coach","email":"athletics@fpctx.edu","phone":"+1-806-274-5311"}]},

    {"name":"San Jacinto College","location":"Pasadena, TX","state":"Texas","region":"USA","country":"USA","division":"JUCO","conference":"NJCAA Region XIV","foreign_friendly":True,"scholarship_type":"Full Athletic","scholarship_info":"Full scholarship. Houston metro area — fourth-largest US city, highly international. Large campus with international student infrastructure.","acceptance_rate":"100%","notable_alumni":"Various Region XIV standouts","ranking":None,"website":"https://sanjac.edu/athletics","image_url":img_bball,"coaches":[{"name":"Michael Turner","title":"Head Coach","email":"athletics@sanjac.edu","phone":"+1-281-998-6150"}]},

    {"name":"Lee College","location":"Baytown, TX","state":"Texas","region":"USA","country":"USA","division":"JUCO","conference":"NJCAA Region XIV","foreign_friendly":True,"scholarship_type":"Full Athletic","scholarship_info":"Full JUCO scholarship. Houston metro. Lee has a strong track record of placing players in D1/D2. International-friendly.","acceptance_rate":"100%","notable_alumni":"Various Region XIV standouts","ranking":None,"website":"https://leecollege.edu/athletics","image_url":img_court,"coaches":[{"name":"Kendrick Jefferson","title":"Head Coach","email":"athletics@lee.edu","phone":"+1-281-425-6390"}]},

    {"name":"Laney College","location":"Oakland, CA","state":"California","region":"USA","country":"USA","division":"JUCO","conference":"CCCAA Bay Valley","foreign_friendly":True,"scholarship_type":"Full Athletic","scholarship_info":"Full scholarship. Oakland CA — Bay Area, one of the most international regions in the US. Very diverse campus. Strong transfer to Cal schools.","acceptance_rate":"100%","notable_alumni":"Various CCCAA standouts","ranking":None,"website":"https://laney.edu/athletics","image_url":img_bball,"coaches":[{"name":"Byron Clay","title":"Head Coach","email":"athletics@laney.edu","phone":"+1-510-834-5740"}]},

    {"name":"Fresno City College","location":"Fresno, CA","state":"California","region":"USA","country":"USA","division":"JUCO","conference":"CCCAA Big 8","foreign_friendly":True,"scholarship_type":"Full Athletic","scholarship_info":"Full scholarship. Central Valley CA — diverse agricultural heartland. Great pathway to Fresno State and other CSU/UC schools.","acceptance_rate":"100%","notable_alumni":"Various CCCAA standouts","ranking":None,"website":"https://fresnocitycollege.edu/athletics","image_url":img_court,"coaches":[{"name":"Corky Higgins","title":"Head Coach","email":"athletics@fresnocitycollege.edu","phone":"+1-559-442-8222"}]},

    {"name":"Southwestern Oregon Community College","location":"Coos Bay, OR","state":"Oregon","region":"USA","country":"USA","division":"JUCO","conference":"NWAC South","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full scholarship. Northwest Athletic Conference. Oregon coast setting. Pathway to Oregon DI/DII schools.","acceptance_rate":"100%","notable_alumni":"Various NWAC standouts","ranking":None,"website":"https://socc.edu","image_url":img_bball,"coaches":[{"name":"Caleb Connelly","title":"Head Coach","email":"athletics@socc.edu","phone":"+1-541-888-2525"}]},

    {"name":"Mount Hood Community College","location":"Gresham, OR","state":"Oregon","region":"USA","country":"USA","division":"JUCO","conference":"NWAC East","foreign_friendly":True,"scholarship_type":"Full Athletic","scholarship_info":"Full scholarship. Portland metro area — Oregon's largest city, highly international community. Strong transfer to Oregon D1/D2.","acceptance_rate":"100%","notable_alumni":"Various NWAC standouts","ranking":None,"website":"https://mhcc.edu/athletics","image_url":img_court,"coaches":[{"name":"Jarrod Traeger","title":"Head Coach","email":"athletics@mhcc.edu","phone":"+1-503-491-7000"}]},

    {"name":"Treasure Valley Community College","location":"Ontario, OR","state":"Oregon","region":"USA","country":"USA","division":"JUCO","conference":"NWAC East","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full JUCO scholarship. NWAC. Oregon-Idaho border region. Small tight-knit campus community.","acceptance_rate":"100%","notable_alumni":"Various NWAC standouts","ranking":None,"website":"https://tvcc.cc","image_url":img_bball,"coaches":[{"name":"Travis Myers","title":"Head Coach","email":"athletics@tvcc.cc","phone":"+1-541-881-8822"}]},

    {"name":"Kankakee Community College","location":"Kankakee, IL","state":"Illinois","region":"USA","country":"USA","division":"JUCO","conference":"Illinois Collegiate Athletic Conference (ICCAC)","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full scholarship. ICCAC. South of Chicago — Illinois JUCO pipeline to D1/D2. Urban-area access.","acceptance_rate":"100%","notable_alumni":"Various ICCAC standouts","ranking":None,"website":"https://kcc.edu","image_url":img_court,"coaches":[{"name":"Phil Geuther","title":"Head Coach","email":"athletics@kcc.edu","phone":"+1-815-802-8100"}]},

    {"name":"Lincoln Trail College","location":"Robinson, IL","state":"Illinois","region":"USA","country":"USA","division":"JUCO","conference":"Illinois Collegiate Athletic Conference (ICCAC)","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full scholarship. ICCAC. Rural Illinois. Strong basketball culture, active transfer portal programme.","acceptance_rate":"100%","notable_alumni":"Various ICCAC standouts","ranking":None,"website":"https://lincolntrail.edu","image_url":img_bball,"coaches":[{"name":"Casey Gover","title":"Head Coach","email":"athletics@lincolntrail.edu","phone":"+1-618-544-8657"}]},

    {"name":"Lake Michigan College","location":"Benton Harbor, MI","state":"Michigan","region":"USA","country":"USA","division":"JUCO","conference":"Michigan Community College Athletic Association (MCCAA)","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full scholarship. MCCAA. Southwest Michigan. Pathway to Michigan D1/D2 schools.","acceptance_rate":"100%","notable_alumni":"Various MCCAA standouts","ranking":None,"website":"https://lakemichigancollege.edu/athletics","image_url":img_court,"coaches":[{"name":"Josh Smaage","title":"Head Coach","email":"athletics@lakemichigancollege.edu","phone":"+1-269-927-8100"}]},

    {"name":"Motlow State Community College","location":"Lynchburg, TN","state":"Tennessee","region":"USA","country":"USA","division":"JUCO","conference":"TCCAA / NJCAA","foreign_friendly":False,"scholarship_type":"Full Athletic","scholarship_info":"Full scholarship. Tennessee JUCO. Jack Daniel's hometown campus. Consistent NJCAA tournament contender.","acceptance_rate":"100%","notable_alumni":"Various D1 transfers","ranking":None,"website":"https://mscc.edu","image_url":img_bball,"coaches":[{"name":"Zach Woodington","title":"Head Coach","email":"athletics@mscc.edu","phone":"+1-931-393-1500"}]},
]


async def run():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # ── Step 1: Audit Euro Friendly badges ──────────────────────
    print("=== EURO FRIENDLY AUDIT ===")
    removed = 0
    for name in REMOVE_EURO_FRIENDLY:
        r = await db.colleges.update_one(
            {"name": name},
            {"$set": {"foreign_friendly": False}}
        )
        if r.matched_count:
            removed += 1
            print(f"  Removed badge: {name}")
        else:
            print(f"  NOT FOUND: {name}")

    print(f"\nRemoved Euro Friendly from {removed} colleges")

    # ── Step 2: Insert new colleges ─────────────────────────────
    print("\n=== ADDING NEW COLLEGES ===")
    added = 0
    skipped = 0
    for col in NEW_COLLEGES:
        existing = await db.colleges.find_one({"name": col["name"]})
        if existing:
            skipped += 1
            print(f"  SKIP: {col['name']}")
            continue
        col["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.colleges.insert_one(col)
        added += 1
        print(f"  Added: {col['name']} [{col['division']}]")

    print(f"\nAdded {added} new colleges, skipped {skipped}")

    # ── Summary ─────────────────────────────────────────────────
    total = await db.colleges.count_documents({})
    for div in ["Division I", "Division II", "NAIA", "JUCO"]:
        count = await db.colleges.count_documents({"division": div})
        euro  = await db.colleges.count_documents({"division": div, "foreign_friendly": True})
        print(f"  {div}: {count} total, {euro} Euro Friendly")
    eu_total = await db.colleges.count_documents({"region": "Europe"})
    print(f"  European clubs: {eu_total}")
    print(f"\nGRAND TOTAL: {total} colleges")


asyncio.run(run())
